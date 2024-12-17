import { getS3BucketFolderName } from "../utility.js";

// db table common status's
export const ACTIVE = "ACTIVE";
export const INACTIVE = "INACTIVE";
export const UNCLAIMED = "UNCLAIMED";
export const CLAIMED = "CLAIMED";

// get timestamp
export const timestamp = {
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ------------S3 bucket folder names START------------
export const companyS3BucketFolderName = getS3BucketFolderName("company");
export const companyExcelFileS3BucketFolderName = getS3BucketFolderName("company-excel");
export const userProfileS3BucketFolderName = getS3BucketFolderName("user-profile");

// ------------S3 bucket folder names END------------

// ------------DROPDOWNS START------------
// company 2 "role" dropdown options
export const ROLE_OPTIONS = [
  { value: "BUSINESS_DEVELOPMENT_&_SALES", label: "Business Development & Sales" },
  { value: "CONSULTING_&_ADVISORY", label: "Consulting & Advisory" },
  { value: "INVESTMENTS_&_FINANCING", label: "Investments & Financing" },
];

// company table status's
export const COMPANY_STATUS = [{ value: CLAIMED }, { value: UNCLAIMED }];

// company 5 "industry" dropdown options
export const INDUSTRY_OPTIONS = [
  { value: "RENEWABLE_ENERGY", label: "Renewable Energy" },
  { value: "ENERGY_EFFICIENCY", label: "Energy Efficiency" },
  { value: "SUSTAINABLE_TRANSPORTATION", label: "Sustainable Transportation" },
  { value: "WASTE_MANAGEMENT/CIRCULAR_ECONOMY", label: "Waste Management/Circular Economy" },
  { value: "SUSTAINABLE_AGRICULTURE/FOOD_SYSTEMS", label: "Sustainable Agriculture/Food Systems" },
];

// company member "profileKeyword" 52 dropdown options
// export const PROFILE_KEYWORDS_OPTIONS = [
//   { value: "CLEAN_TECHNOLOGY", label: "Clean Technology" },
//   { value: "CLIMATE_SOLUTIONS", label: "Climate Solutions" },
//   { value: "DECARBONIZATION", label: "Decarbonization" },
//   { value: "NET_ZERO", label: "Net Zero" },
//   { value: "GREEN_INNOVATION", label: "Green Innovation" },
//   { value: "ENVIRONMENTAL_IMPACT", label: "Environmental Impact" },
//   { value: "SOLAR_POWER", label: "Solar Power" },
//   { value: "WIND_ENERGY", label: "Wind Energy" },
//   { value: "HYDROPOWER", label: "Hydropower" },
//   { value: "GEOTHERMAL_ENERGY", label: "Geothermal Energy" },
//   { value: "BIOENERGY", label: "Bioenergy" },
//   { value: "ENERGY_STORAGE", label: "Energy Storage" },
//   { value: "SMART_GRID", label: "Smart Grid" },
//   { value: "ENERGY_OPTIMIZATION", label: "Energy Optimization" },
//   { value: "BUILDING_AUTOMATION", label: "Building Automation" },
//   { value: "LED_LIGHTING", label: "LED Lighting" },
//   { value: "ENERGY_AUDITS", label: "Energy Audits" },
//   { value: "HVAC_EFFICIENCY", label: "HVAC Efficiency" },
//   { value: "ELECTRIC_VEHICLES_EVS", label: "Electric Vehicles (EVs)" },
//   { value: "CHARGING_INFRASTRUCTURE", label: "Charging Infrastructure" },
//   { value: "MICROMOBILITY", label: "Micromobility" },
//   { value: "HYDROGEN_FUEL", label: "Hydrogen Fuel" },
//   { value: "PUBLIC_TRANSIT_SOLUTIONS", label: "Public Transit Solutions" },
//   { value: "FLEET_ELECTRIFICATION", label: "Fleet Electrification" },
//   { value: "RECYCLING", label: "Recycling" },
//   { value: "COMPOSTING", label: "Composting" },
//   { value: "UPCYCLING", label: "Upcycling" },
//   { value: "ZERO_WASTE", label: "Zero Waste" },
//   { value: "PLASTIC_ALTERNATIVES", label: "Plastic Alternatives" },
//   { value: "CIRCULAR_DESIGN", label: "Circular Design" },
//   { value: "REGENERATIVE_FARMING", label: "Regenerative Farming" },
//   { value: "VERTICAL_FARMING", label: "Vertical Farming" },
//   { value: "AGRITECH", label: "AgriTech" },
//   { value: "ALTERNATIVE_PROTEINS", label: "Alternative Proteins" },
//   { value: "SOIL_HEALTH", label: "Soil Health" },
//   { value: "SUSTAINABLE_SUPPLY_CHAIN", label: "Sustainable Supply Chain" },
//   { value: "CARBON_SEQUESTRATION", label: "Carbon Sequestration" },
//   { value: "CARBON_CREDITS", label: "Carbon Credits" },
//   { value: "EMISSIONS_MONITORING", label: "Emissions Monitoring" },
//   { value: "DIRECT_AIR_CAPTURE", label: "Direct Air Capture" },
//   { value: "CARBON_NEUTRAL", label: "Carbon Neutral" },
//   { value: "WATER_CONSERVATION", label: "Water Conservation" },
//   { value: "DESALINATION", label: "Desalination" },
//   { value: "RAINWATER_HARVESTING", label: "Rainwater Harvesting" },
//   { value: "SUSTAINABLE_IRRIGATION", label: "Sustainable Irrigation" },
//   { value: "ECOSYSTEM_RESTORATION", label: "Ecosystem Restoration" },
//   { value: "RENEWABLE_MATERIALS", label: "Renewable Materials" },
//   { value: "CLIMATE_FINANCING", label: "Climate Financing" },
//   { value: "GREEN_BUILDING", label: "Green Building" },
//   { value: "ESG_REPORTING", label: "ESG Reporting" },
//   { value: "BIODIVERSITY_PROTECTION", label: "Biodiversity Protection" },
//   { value: "RENEWABLE_HEAT", label: "Renewable Heat" },
// ];

// company member "profileKeyword" temp 5 dropdown options
export const PROFILE_KEYWORDS_OPTIONS = [
  { value: "CHARGING_SOLUTIONS", label: "Charging Solutions" },
  { value: "DECARBONIZATION", label: "Decarbonization" },
  { value: "WATER_TREATMENTS", label: "Water Treatments" },
  { value: "ELECTRICAL_INFRASTRUCTURE", label: "Electrical Infrastructure" },
  { value: "SMART_METERING", label: "Smart Metering" },
];

// company member "organization" 4 dropdown options
export const ORGANIZATION_OPTIONS = [
  { value: "CLEAN_TECHNOLOGY", label: "Clean Technology" },
  { value: "ESG_REPORTING", label: "ESG Reporting" },
  { value: "BIODIVERSITY_PROTECTION", label: "Biodiversity Protection" },
  { value: "RENEWABLE_HEAT", label: "Renewable Heat" },
];

// User profile "Looking for" options
export const LOOKING_FOR_OPTIONS = [
  { value: "REFERRAL_PARTNERS", label: "Referral Partners" },
  { value: "CLEANTECH_PROJECTS", label: "CleanTech Projects" },
  { value: "INDUSTRY_INSIGHTS", label: "Industry Insights" },
  { value: "SERVICE_PARTNERS", label: "Service Partners" },
  { value: "OTHER", label: "Other" },
];

// User profile "Industry tags" options
export const INDUSTRY_TAGS_OPTIONS = [
  { value: "GREEN_HYDROGEN", label: "Green Hydrogen" },
  { value: "RENEWABLE_ENERGY", label: "Renewable Energy" },
  { value: "INDUSTRIAL_SUSTAINABILITY", label: "Industrial Sustainability" },
];

// User profile "Asks" options
export const ASKS_OPTIONS = [{ value: "STRATEGIC_INTRODUCTION", label: "Strategic Introduction" }];

// User profile "Gives" options
export const GIVES_OPTIONS = [{ value: "INNOVATIVE_SOLUTION", label: "Innovative Solution" }];

// ------------DROPDOWNS END------------

// ------------ MODULE TYPE AND STATUS START ------------
// ------Introduction types START------
export const TARGET = "TARGET";
export const GENERAL = "GENERAL";
// ------Introduction types END------

// ------Introduction status START------
export const IntroductionStatus = {
  REQUESTED: "REQUESTED", // Introduction requested
  RECEIVED: "RECEIVED",
  WITHDRAW: "WITHDRAW",
  ACCEPTED: "ACCEPTED",
  DENIED: "DENIED",
  COMPLETED: "COMPLETED",
  MATCHED: "MATCHED",
  SUGGESTED: "SUGGESTED",
};
export const INTRODUCTION_STATUS = Object.values(IntroductionStatus);

export const targetTypes = {
  COMPANY: "COMPANY",
  INDIVIDUAL: "INDIVIDUAL",
};
// ------Introduction status END------

// ------Invitation status START------
export const InvitationStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
};
export const INVITATION_STATUS = Object.values(InvitationStatus);
// ------Invitation status END------

// ------------ MODULE TYPE AND STATUS END ------------
