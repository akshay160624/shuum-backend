import { COMPANY_TABLE } from "../helpers/db-tables.js";
import { fetchOneFromDb } from "../mongodb.js";

export const fetchCompany = async (filter) => {
  return await fetchOneFromDb(COMPANY_TABLE, filter);
};
