import { COMPANY_MEMBER_TABLE, COMPANY_TABLE } from "../helpers/db-tables.js";
import { fetchOneFromDb } from "../mongodb.js";

export const fetchCompany = async (filter) => {
  return await fetchOneFromDb(COMPANY_TABLE, filter);
};

export const fetchCompanyMember = async (filter) => {
  return await fetchOneFromDb(COMPANY_MEMBER_TABLE, filter);
};
