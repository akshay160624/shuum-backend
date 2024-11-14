import { COMPANY_TABLE } from "../services/helpers/db-tables.js";
import { BAD_REQUEST, ERROR, NOT_FOUND, SUCCESS } from "../services/helpers/status-code.js";
import * as responseHelper from "../services/helpers/response-helper.js";
import { aggregateFromDb, fetchOneFromDb, insertManyToDb } from "../services/mongodb.js";
import { companyInsertRequestValidate } from "../services/validations/company.validations.js";
import { v4 as uuidv4 } from "uuid";
import lodash from "lodash";
import { ACTIVE, UNCLAIMED } from "../services/helpers/constants.js";
const { isEmpty } = lodash;

export const addCompany = async (req, res) => {
  try {
    // Validate request
    const isNotValid = await companyInsertRequestValidate(req.body);
    if (isNotValid) return responseHelper.error(res, isNotValid.message, BAD_REQUEST);

    const { company_name: companyName = "", industry: industry = "" } = req.body;

    const companyFilter = {
      company_name: {
        $regex: new RegExp(`^${companyName.trim()}$`, "i"),
      },
    };

    // check company exist in db
    const isCompanyExist = await fetchOneFromDb(COMPANY_TABLE, companyFilter);
    if (!isEmpty(isCompanyExist)) return responseHelper.error(res, `Company already exists!`, BAD_REQUEST);

    const dataToInsert = [];
    await Promise.all(
      req.files.map(async (file) => {
        const documentUpload = {
          company_id: uuidv4(),
          company_name: companyName.trim(),
          industry: industry.trim(),
          document_url: file.location,
          document_name: file.originalname,
          status: UNCLAIMED,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dataToInsert.push(documentUpload);
      })
    );

    // insert into the database
    const companySaved = await insertManyToDb(COMPANY_TABLE, dataToInsert);
    if (!isEmpty(companySaved)) {
      return responseHelper.success(res, "Company saved successfully", SUCCESS);
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

    let query = [];

    // let query = [
    //   {
    //     $match: {
    //       status: ACTIVE, // TODO: Check multiple status if required
    //     },
    //   },
    // ];

    if (searchText) {
      const searchQuery = {
        $match: {
          company_name: {
            $regex: new RegExp(searchText.trim(), "i"),
          },
        },
      };
      query.push(searchQuery);
    }

    // // TODO: Add company member lookup
    // const productLookup = {
    //   $lookup: {
    //     from: "products",
    //     localField: "category_id",
    //     foreignField: "parent_id",
    //     as: "product",
    //   },
    // };
    // query.push(productLookup);

    const projection = {
      $project: {
        _id: 0,
        company_id: 1,
        company_name: 1,
        industry: 1,
        document_url: 1,
      },
    };
    query.push(projection);

    const companyList = await aggregateFromDb(COMPANY_TABLE, query);
    if (!isEmpty(companyList)) {
      return responseHelper.success(res, "Company list fetched successfully", SUCCESS, companyList);
    } else {
      return responseHelper.error(res, "No company found for the provided search criteria", NOT_FOUND);
    }
  } catch (err) {
    return responseHelper.error(res, err.message, ERROR);
  }
};
