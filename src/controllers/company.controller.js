import { COMPANY_TABLE } from "../services/helpers/db-tables.js";
import { BAD_REQUEST, ERROR, NOT_FOUND, SUCCESS } from "../services/helpers/status-code.js";
import * as responseHelper from "../services/helpers/response-helper.js";
import { aggregateFromDb, insertManyToDb, insertOneToDb } from "../services/mongodb.js";
import { companyInsertRequestValidate } from "../services/validations/company.validations.js";
import { v4 as uuidv4 } from "uuid";
import lodash from "lodash";
import { INDUSTRY_OPTIONS, UNCLAIMED, timestamp } from "../services/helpers/constants.js";
import { fetchCompany } from "../services/validations/db.services.js";
import { INVALID_REQUEST, SOMETHING_WENT_WRONG } from "../services/helpers/response-message.js";
import csv from "csvtojson";
import axios from "axios";
import { deleteCache, getCache, hasCache, setCache } from "../services/helpers/cache.js";
import { findOptionByValue } from "../services/utility.js";
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
    const { company_name: companyName = "", industry: industry = "" } = req.body;

    // industry available then validate
    if (!isEmpty(industry)) {
      const industryOption = findOptionByValue(INDUSTRY_OPTIONS, industry);
      if (!industryOption) {
        return responseHelper.error(res, "Invalid industry value", BAD_REQUEST);
      }
    }

    const companyFilter = {
      company_name: {
        $regex: new RegExp(`^${companyName.trim()}$`, "i"),
      },
    };

    // check company exist in db
    const isCompanyExist = await fetchCompany(companyFilter);
    if (!isEmpty(isCompanyExist)) return responseHelper.error(res, `Company already exists!`, BAD_REQUEST);

    const { location, originalname } = req.file;
    const companyDetails = {
      company_id: uuidv4(),
      company_name: companyName.trim(),
      email: "",
      phone: "",
      website: "",
      established_year: "",
      founder: "",
      postal_code: "",
      headquarters: "",
      industry: industry ? industry.toUpperCase().trim() : "",
      key_services: "",
      focus_area: "",
      description: "",
      image_url: location,
      image_name: originalname,
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
    return responseHelper.error(res, err.message, ERROR);
  }
};

export const companyList = async (req, res) => {
  try {
    const { search_text: searchText = "" } = req.query;

    let filter = {
      // status: ACTIVE,
    };

    const searchData = new RegExp(searchText.trim(), "i");

    if (searchText) {
      filter = {
        ...filter,
        company_name: {
          $regex: searchData,
        },
      };
    }

    let query = [
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
          // Count the number of company members
          members_images: {
            $push: "$companyMembers.profile_url", // Collect image URLs of company members
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
          members_images: 1, // Limit the members_images array to 3 images only
          // members_images: { $slice: ["$members_images", 3] }, // Limit the members_images array to 3 images only
        },
      },
    ];

    // fetch company list
    let companyList = [];
    if (!searchText && hasCache("companies")) {
      companyList = getCache("companies"); // fetch company list cache
    } else {
      companyList = await aggregateFromDb(COMPANY_TABLE, query);
      if (!searchText) {
        setCache("companies", companyList); // set company list cache
      }
    }
    if (!isEmpty(companyList)) {
      return responseHelper.success(res, "Company list fetched successfully", SUCCESS, companyList);
    } else {
      return responseHelper.error(res, "No company found", NOT_FOUND);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
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
    return responseHelper.error(res, err.message, ERROR);
  }
};
