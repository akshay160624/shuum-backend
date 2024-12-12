import { COMPANY_TABLE } from "../services/helpers/db-tables.js";
import { BAD_REQUEST, ERROR, NOT_FOUND, SUCCESS } from "../services/helpers/status-code.js";
import * as responseHelper from "../services/helpers/response-helper.js";
import { aggregateFromDb, fetchOneFromDb, insertManyToDb, insertOneToDb, updateOneToDb } from "../services/mongodb.js";
import { companyInsertRequestValidate, companyUpdateRequestValidate } from "../services/validations/company.validations.js";
import { v4 as uuidv4 } from "uuid";
import lodash from "lodash";
import { COMPANY_STATUS, INDUSTRY_OPTIONS, UNCLAIMED, companyS3BucketFolderName, timestamp } from "../services/helpers/constants.js";
import { fetchCompany } from "../services/db.services.js";
import { INVALID_REQUEST, SOMETHING_WENT_WRONG } from "../services/helpers/response-message.js";
import csv from "csvtojson";
import axios from "axios";
import { deleteCache, getCache, hasCache, setCache } from "../services/helpers/cache.js";
import { findOptionByValue, validateEmail, validateEstablishedYear, validatePhoneNumber, validatePostalCode, validateWebsiteURL } from "../services/utility.js";
import { deleteFileFromS3 } from "../middleware/image-upload.js";
const { isEmpty } = lodash;

export const addCompany = async (req, res) => {
  try {
    // 1: Check if a file is uploaded
    if (!req.file) {
      return responseHelper.error(res, "Image is required", BAD_REQUEST);
    }

    // Validate request
    const isNotValid = await companyInsertRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { user } = req;
    const {
      company_name: companyName = "",
      email = "",
      phone = "",
      industry: industry = "",
      founder = "",
      established_year: establishedYear = "",
      website = "",
      headquarters = "",
      focus_area: focusArea = "",
      description = "",
      postal_code: postalCode = null,
      key_services: keyServices = [],
    } = req.body;

    // industry available then validate
    if (!isEmpty(industry)) {
      const industryOption = findOptionByValue(INDUSTRY_OPTIONS, industry);
      if (!industryOption) {
        return responseHelper.error(res, "Invalid industry value", BAD_REQUEST);
      }
    }

    if (!isEmpty(phone)) {
      const validationResult = validatePhoneNumber(phone);
      if (!isEmpty(validationResult)) {
        return responseHelper.error(res, validationResult, BAD_REQUEST);
      }
    }

    if (!isEmpty(establishedYear)) {
      // validate established year
      const validEstablishedYearResult = validateEstablishedYear(establishedYear);
      if (!isEmpty(validEstablishedYearResult)) {
        return responseHelper.error(res, validEstablishedYearResult, BAD_REQUEST);
      }
    }

    if (!isEmpty(website)) {
      // validate website
      const validUrlResult = validateWebsiteURL(website);
      if (!isEmpty(validUrlResult)) {
        return responseHelper.error(res, validUrlResult, BAD_REQUEST);
      }
    }

    let keyServicesUppercase = [];
    if (!isEmpty(keyServices)) {
      if (Array.isArray(keyServices) && keyServices.every((item) => typeof item === "string")) {
        // Convert all keywords to uppercase
        keyServicesUppercase = keyServices.map((keyword) => keyword.toUpperCase());
      } else {
        return responseHelper.error(res, "Key services must be an array of strings", BAD_REQUEST);
      }
    }

    if (!isEmpty(description) && description.length > 250) {
      return responseHelper.error(res, "Description must not exceed 250 characters", BAD_REQUEST);
    }

    if (!isEmpty(postalCode)) {
      // validate postal code year
      const validPostalCodeResult = validatePostalCode(postalCode);
      if (!isEmpty(validPostalCodeResult)) {
        return responseHelper.error(res, validPostalCodeResult, BAD_REQUEST);
      }
    }

    const emailFilter = { email: email.toLowerCase().trim() };
    const emailExist = await fetchCompany(emailFilter);
    if (!isEmpty(emailExist)) return responseHelper.error(res, `Email already exists!`, BAD_REQUEST);

    const companyFilter = {
      company_name: {
        $regex: new RegExp(`^${companyName.trim()}$`, "i"),
      },
    };

    // check company exist in db
    const isCompanyExist = await fetchCompany(companyFilter);
    if (!isEmpty(isCompanyExist)) return responseHelper.error(res, `Company already exists!`, BAD_REQUEST);

    const { location, originalname, filename: fileName } = req.file;
    const companyDetails = {
      company_id: uuidv4(),
      company_name: companyName.trim(),
      email: email,
      phone: phone,
      website: website.trim(),
      established_year: establishedYear.trim(),
      founder: founder.trim(),
      postal_code: postalCode,
      headquarters: headquarters,
      industry: industry ? industry.toUpperCase().trim() : "",
      key_services: keyServicesUppercase,
      focus_area: focusArea.trim(),
      description: description.trim(),
      image_url: location,
      image_name: fileName,
      status: UNCLAIMED,
      createdBy: user?.user_id || "",
      ...timestamp,
    };

    // insert into the database
    const companySaved = await insertOneToDb(COMPANY_TABLE, companyDetails);
    if (!isEmpty(companySaved)) {
      deleteCache("companies"); // delete company list cache
      const responseData = {
        company_id: companyDetails?.company_id,
      };
      return responseHelper.success(res, "Company added successfully", SUCCESS, responseData);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err?.message, ERROR);
  }
};

export const companyList = async (req, res) => {
  try {
    const { search_text: searchText = "", status: statusRaw } = req.query;

    // make status as request format
    const status = statusRaw ? statusRaw.toUpperCase().trim() : "";

    let filter = {};
    if (!isEmpty(status)) {
      const validCompanyStatus = findOptionByValue(COMPANY_STATUS, status);
      if (!validCompanyStatus) {
        return responseHelper.error(res, "Invalid status value", BAD_REQUEST);
      }
      filter.status = status;
    }

    if (searchText) {
      filter = {
        ...filter,
        company_name: {
          $regex: new RegExp(searchText.trim(), "i"),
        },
      };
    }

    const query = [
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "users",
          localField: "company_id",
          foreignField: "company_id",
          as: "companyMembers",
        },
      },
      {
        $unwind: {
          path: "$companyMembers",
          preserveNullAndEmptyArrays: true, // Keep companies without members
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: "$company_id",
          company_id: {
            $first: "$company_id",
          },
          company_name: {
            $first: "$company_name",
          },
          email: {
            $first: "$email",
          },
          phone: {
            $first: "$phone",
          },
          website: {
            $first: "$website",
          },
          established_year: {
            $first: "$established_year",
          },
          founder: {
            $first: "$founder",
          },
          postal_code: {
            $first: "$postal_code",
          },
          headquarters: {
            $first: "$headquarters",
          },
          industry: {
            $first: "$industry",
          },
          key_services: {
            $first: "$key_services",
          },
          focus_area: {
            $first: "$focus_area",
          },
          description: {
            $first: "$description",
          },
          industry: {
            $first: "$industry",
          },
          company_image: {
            $first: "$image_url",
          },
          status: {
            $first: "$status",
          },
          members_count: {
            $sum: {
              $cond: {
                if: {
                  $ifNull: ["$companyMembers", false],
                }, // Check if companyMembers exists and is not null
                then: 1,
                else: 0,
              },
            },
          },
          members: {
            $push: {
              $cond: [
                { $ifNull: ["$companyMembers.user_id", false] }, // Check if user_id exists
                {
                  user_id: "$companyMembers.user_id",
                  email: "$companyMembers.email",
                  name: "$companyMembers.name",
                  image: "$companyMembers.profile_url",
                },
                // Skip pushing null or invalid members
                null,
              ],
            },
          },
        },
      },
      {
        $addFields: {
          members: {
            $filter: {
              input: "$members",
              as: "member",
              cond: { $ne: ["$$member", null] }, // Remove null values
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          company_id: 1,
          company_name: 1,
          email: 1,
          phone: 1,
          website: 1,
          established_year: 1,
          founder: 1,
          postal_code: 1,
          headquarters: 1,
          industry: 1,
          key_services: 1,
          focus_area: 1,
          description: 1,
          company_image: 1,
          status: 1,
          members_count: 1,
          members: 1,
        },
      },
    ];

    // fetch company list
    const companyList = await aggregateFromDb(COMPANY_TABLE, query);
    if (!isEmpty(companyList)) {
      return responseHelper.success(res, "Company list fetched successfully", SUCCESS, companyList);
    } else {
      return responseHelper.error(res, "No company found", NOT_FOUND);
    }
  } catch (err) {
    return responseHelper.error(res, err?.message, ERROR);
  }
};

export const importCompanies = async (req, res) => {
  try {
    // 1: Check if a file is uploaded
    if (!req.file) {
      return responseHelper.error(res, INVALID_REQUEST, BAD_REQUEST);
    }

    // 2: Fetch the CSV file
    const response = await axios.get(req.file.location);
    const csvData = response.data;

    // 3: Format CSV file to JSON
    const jsonCsvData = await csv().fromString(csvData);

    // 4: Generate companies data to insert
    const companyDataToInsert = [];
    for (let i = 0; i < jsonCsvData.length; i++) {
      const companyData = jsonCsvData[i];

      const companyFilter = {
        company_name: {
          $regex: new RegExp(`^${companyData?.name.trim()}$`, "i"),
        },
      };

      // check company exist in db
      const isCompanyExist = await fetchCompany(companyFilter);
      if (!isEmpty(isCompanyExist)) return responseHelper.error(res, `'${companyData?.name}' company already exists!`, BAD_REQUEST);

      const companyDetails = {
        company_id: uuidv4(),
        company_name: companyData?.name.trim() || "",
        email: companyData?.email.trim() || "",
        phone: companyData?.phone.trim() || "",
        website: companyData?.website.trim() || "",
        established_year: companyData?.established_year.trim() || "",
        founder: companyData?.founder.trim() || "",
        postal_code: companyData?.postal_code.trim() || "",
        headquarters: companyData?.headquarters.trim() || "",
        industry: companyData?.industry.trim() || "",
        key_services: companyData?.key_services.trim() || "",
        focus_area: companyData?.focus_area.trim() || "",
        description: companyData?.description.trim() || "",
        image_url: "",
        image_name: "",
        status: UNCLAIMED,
        createdBy: "",
        ...timestamp,
      };
      companyDataToInsert.push(companyDetails);
    }

    // insert into the database
    const companiesSaved = await insertManyToDb(COMPANY_TABLE, companyDataToInsert);
    if (!isEmpty(companiesSaved)) {
      return responseHelper.success(res, `${companyDataToInsert.length} Companies added successfully`, SUCCESS);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err?.message, ERROR);
  }
};

export const updateCompany = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await companyUpdateRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { user } = req; //  user from token
    const {
      company_id: companyId,
      company_name: companyName = "",
      phone,
      email,
      website,
      established_year: establishedYear,
      founder,
      postal_code: postalCode,
      headquarters,
      industry: industry = "",
      key_services: keyServices = [],
      focus_area: focusArea,
      description,
      status,
    } = req.body;

    const companyFilter = {
      company_id: companyId,
    };

    // check company exist in db
    const isCompanyExist = await fetchCompany(companyFilter);
    if (isEmpty(isCompanyExist)) return responseHelper.error(res, `Company does not exists!`, BAD_REQUEST);

    const { location, originalname, filename: fileName } = req.file;
    const companyUpdateData = { updatedAt: new Date() };

    if (!isEmpty(companyName)) companyUpdateData.company_name = companyName.trim();
    if (!isEmpty(phone)) {
      // validate phone
      const validationResult = validatePhoneNumber(phone);
      if (!isEmpty(validationResult)) {
        return responseHelper.error(res, validationResult, BAD_REQUEST);
      }
      companyUpdateData.phone = phone.trim();
    }

    if (!isEmpty(email)) {
      // validate email
      const validEmailResult = validateEmail(email);
      if (!isEmpty(validEmailResult)) {
        return responseHelper.error(res, validEmailResult, BAD_REQUEST);
      }
      const companyEmailFilter = {
        company_id: { $ne: companyId },
        email: email.toLowerCase().trim(),
      };
      const emailExist = await fetchOneFromDb(COMPANY_TABLE, companyEmailFilter);
      if (!isEmpty(emailExist)) {
        return responseHelper.error(res, "Email already exists", BAD_REQUEST);
      }
      companyUpdateData.email = email.toLowerCase().trim();
    }

    if (!isEmpty(website)) {
      // validate website
      const validUrlResult = validateWebsiteURL(website);
      if (!isEmpty(validUrlResult)) {
        return responseHelper.error(res, validUrlResult, BAD_REQUEST);
      }
      companyUpdateData.website = website.trim();
    }

    if (!isEmpty(establishedYear)) {
      // validate established year
      const validEstablishedYearResult = validateEstablishedYear(establishedYear);
      if (!isEmpty(validEstablishedYearResult)) {
        return responseHelper.error(res, validEstablishedYearResult, BAD_REQUEST);
      }
      companyUpdateData.established_year = establishedYear.trim();
    }

    if (!isEmpty(founder)) companyUpdateData.founder = founder.trim();

    if (!isEmpty(postalCode)) {
      // validate postal code year
      const validPostalCodeResult = validatePostalCode(postalCode);
      if (!isEmpty(validPostalCodeResult)) {
        return responseHelper.error(res, validPostalCodeResult, BAD_REQUEST);
      }
      companyUpdateData.postal_code = postalCode.trim();
    }

    if (!isEmpty(headquarters)) companyUpdateData.headquarters = headquarters.trim();

    // industry available then validate
    if (!isEmpty(industry)) {
      const industryOption = findOptionByValue(INDUSTRY_OPTIONS, industry);
      if (!industryOption) {
        return responseHelper.error(res, "Invalid industry value", BAD_REQUEST);
      }
      companyUpdateData.industry = industry.toUpperCase().trim();
    }

    if (!isEmpty(keyServices)) {
      if (Array.isArray(keyServices) && keyServices.every((item) => typeof item === "string")) {
        // Convert all keywords to uppercase
        companyUpdateData.key_services = keyServices.map((keyword) => keyword.toUpperCase());
      } else {
        return responseHelper.error(res, "Key services must be an array of strings", BAD_REQUEST);
      }
    }

    // if (!isEmpty(keyServices)) companyUpdateData.key_services = keyServices.trim();
    if (!isEmpty(focusArea)) companyUpdateData.focus_area = focusArea.trim();
    if (!isEmpty(description)) {
      if (description.length > 250) {
        return responseHelper.error(res, "Description must not exceed 250 characters", BAD_REQUEST);
      }
      companyUpdateData.description = description.trim();
    }

    if (!isEmpty(status)) {
      const validCompanyStatus = findOptionByValue(COMPANY_STATUS, status);
      if (!validCompanyStatus) {
        return responseHelper.error(res, "Invalid status value", BAD_REQUEST);
      }
      companyUpdateData.status = status.toUpperCase().trim();
    }

    if (!isEmpty(location)) {
      // if have image then delete old image from S3
      const key = isCompanyExist.image_name;
      await deleteFileFromS3(key, companyS3BucketFolderName);
      companyUpdateData.image_url = location;
      companyUpdateData.image_name = fileName;
    }

    if (Object.keys(companyUpdateData).length > 1) {
      companyUpdateData.updatedBy = user?.user_id;
    }

    // update user data
    const companyUpdated = await updateOneToDb(COMPANY_TABLE, companyFilter, companyUpdateData);
    if (companyUpdated) {
      return responseHelper.success(res, "Company details update successfully", SUCCESS);
    } else {
      return responseHelper.error(res, SOMETHING_WENT_WRONG, ERROR);
    }
  } catch (err) {
    return responseHelper.error(res, err?.message, ERROR);
  }
};

export const companyView = async (req, res) => {
  try {
    const { company_id: companyId = "" } = req.params;

    if (isEmpty(companyId)) {
      return responseHelper.error(res, "company_id is required", BAD_REQUEST);
    }

    const companyDetails = await fetchCompany({ company_id: companyId });
    if (isEmpty(companyDetails)) {
      return responseHelper.error(res, `No company found!`, NOT_FOUND);
    }

    const responseData = {
      company_id: companyDetails?.company_id || "",
      company_name: companyDetails?.company_name || "",
      email: companyDetails?.email || "",
      phone: companyDetails?.phone || "",
      website: companyDetails?.website || "",
      established_year: companyDetails?.established_year || "",
      founder: companyDetails?.founder || "",
      postal_code: companyDetails?.postal_code || "",
      headquarters: companyDetails?.headquarters || "",
      industry: companyDetails?.industry || "",
      key_services: companyDetails?.key_services || "",
      focus_area: companyDetails?.focus_area || "",
      description: companyDetails?.description || "",
      image_url: companyDetails?.image_url || "",
      createdAt: companyDetails?.createdAt || "",
    };
    return responseHelper.success(res, "Company details fetched successfully", SUCCESS, responseData);
  } catch (err) {
    return responseHelper.error(res, err?.message, ERROR);
  }
};
