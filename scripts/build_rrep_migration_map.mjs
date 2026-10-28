import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "outputs", "rrep-migration-map");
const outPath = path.join(outDir, "RREP_Investments_Migration_Map.xlsx");
const artifactToolPath = pathToFileURL(
  "C:\\Users\\Testimony Adegoke\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\@oai\\artifact-tool\\dist\\artifact_tool.mjs",
).href;
const { Workbook, SpreadsheetFile } = await import(artifactToolPath);

const rows = [
  ["Current path", "Item type", "Recommended destination branch", "Recommended target path", "Action", "Reasoning"],
  ["Investments/0. Admin", "Folder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management", "Move folder; keep internal structure where possible", "Admin and coordination material belongs in project management rather than business development."],
  ["Investments/0. Admin/9. Advisory Report", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Advisory Report", "Move subfolder", "Advisory and governance outputs support project oversight."],
  ["Investments/0. Admin/7.others", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Miscellaneous Admin", "Review then move", "Catch-all admin content should stay near project coordination but may need cleanup."],
  ["Investments/0. Admin/InfraCo Africa Reg Doc", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/05-Regulatory/InfraCo Africa", "Move subfolder", "Regulatory submissions and registrations fit the regulatory branch."],
  ["Investments/0. Admin/6. OGP- Reports", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Reporting/OGP Reports", "Move subfolder", "Operating reports belong with project reporting records."],
  ["Investments/0. Admin/5. Consents", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/05-Regulatory/Consents", "Move subfolder", "Consents are regulatory or permitting records."],
  ["Investments/0. Admin/0. Equity Contribution", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Finance & Funding/Equity Contribution", "Move subfolder", "Funding close records are active project financing documents."],
  ["Investments/0. Admin/4. Reporting Templates", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Templates/Reporting", "Move subfolder", "Templates support recurring project reporting."],
  ["Investments/0. Admin/3. Tax", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Finance & Funding/Tax", "Move subfolder", "Tax working files are project finance administration, not pipeline development."],
  ["Investments/0. Admin/1. General Requirements", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Requirements", "Move subfolder", "Requirements should sit with project control documentation."],
  ["Investments/0. Admin/2. Management Policies", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/04- HSES /Policies & Management Systems", "Move subfolder", "Policy documents are better aligned with governance and HSES controls."],
  ["Investments/0. Admin/Hassan/Amine updates 23/01/2024", "File", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Meeting Notes", "Move file", "This is clearly a project update note."],
  ["Investments/1. Finance", "Folder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Finance & Funding", "Move folder; keep finance substructure", "The contents are project finance records rather than business development pipeline material."],
  ["Investments/1. Finance/1. Financial Model", "Subfolder", "Business development", "Sierra Leone Business Development/6 - Pipeline, C&I and Demand Stimulation/C&I/RREP/Pricing", "Copy or shortcut; keep project reference", "Financial models are useful in active execution and in investment/business case history."],
  ["Investments/1. Finance/2. Audited Financials", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Finance & Funding/Audited Financials", "Move subfolder", "Audited financials are part of ongoing project finance records."],
  ["Investments/1. Finance/3. Invoicing", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Finance & Funding/Invoicing", "Move subfolder", "Invoices are operational project records."],
  ["Investments/1. Finance/4. Consulting Services", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Consulting Services", "Move subfolder", "Vendor and advisor engagement files fit project management."],
  ["Investments/1. Finance/OGP Transfer to WPUSA", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Finance & Funding/OGP Transfer to WPUSA", "Move subfolder", "Transfer and internal funding administration belong with project finance."],
  ["Investments/2. Operating Records & Reporting", "Folder", "Project", "1. Rural Renewable Energy Project (RREP)/08-Operations & Maintenance", "Move folder; split subfolders by theme", "This is the clearest operational branch in the new structure."],
  ["Investments/2. Operating Records & Reporting/2. Local Technical Operating Manual", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/08-Operations & Maintenance/Operating Manual", "Move subfolder", "Operational manuals belong in O&M."],
  ["Investments/2. Operating Records & Reporting/3. Progress reports", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Reporting/Progress Reports", "Move subfolder", "Progress reporting is project control rather than field operations."],
  ["Investments/2. Operating Records & Reporting/6. Annual Submissions", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/05-Regulatory/Annual Submissions", "Move subfolder", "Formal submissions should sit in the regulatory branch."],
  ["Investments/2. Operating Records & Reporting/8. PDSC Committee", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Governance/PDSC Committee", "Move subfolder", "Committee governance records fit project management."],
  ["Investments/2. Operating Records & Reporting/9. Environmental Protection Agency", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/05-Regulatory/Environmental Protection Agency", "Move subfolder", "EPA documentation is regulatory."],
  ["Investments/2. Operating Records & Reporting/10. Ministry of Energy - RREP", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/06-Customer /Ministry of Energy", "Move subfolder", "Counterparty-facing correspondence and approvals fit the customer/government branch."],
  ["Investments/2. Operating Records & Reporting/11.FCDO and UNOPS", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/06-Customer /FCDO and UNOPS", "Move subfolder", "Key external stakeholder records belong with customer/donor interfaces."],
  ["Investments/2. Operating Records & Reporting/12 Investment decisions", "Subfolder", "Business development", "Sierra Leone Business Development/1 - UNOPS - PowerGen Bid/RREP/Investment Committee", "Copy or shortcut; retain project cross-reference", "Historic investment decisions are important for deal history and IC audit trail."],
  ["Investments/2. Operating Records & Reporting/Development Initiatives", "Subfolder", "Business development", "Sierra Leone Business Development/6 - Pipeline, C&I and Demand Stimulation/C&I/RREP/Development Initiatives", "Move subfolder", "Development pipeline material fits business development."],
  ["Investments/2. Operating Records & Reporting/SLEWRC", "Subfolder", "Project", "1. Rural Renewable Energy Project (RREP)/06-Customer /SLEWRC", "Move subfolder", "This appears to be stakeholder or utility interface documentation."],
  ["Investments/3. Training - Funding CPs", "Folder", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Training & Onboarding", "Move folder; keep topical subfolders", "Training records support delivery and handover."],
  ["Investments/3. Training - Funding CPs/0. Training Program - SBU to BU Knowledge Transfer.xlsx", "File", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Training & Onboarding", "Move file", "Knowledge-transfer workbook is a project onboarding asset."],
  ["Investments/3. Training - Funding CPs/Funding CPs - OGP.pdf.23/02/2021", "File", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Training & Onboarding", "Move file", "Standalone funding-condition training reference belongs with the training set."],
  ["Investments/3. Training - Funding CPs/all trip folders and training session folders", "Subfolders", "Project", "1. Rural Renewable Energy Project (RREP)/02-Project Management/Training & Onboarding", "Move subfolders", "Travel, induction, and training packs support team setup and operational readiness."],
  ["Investments/4. Signed WP2 Land Leases", "Folder", "Project", "1. Rural Renewable Energy Project (RREP)/05-Regulatory/Land Leases/WP2", "Move folder", "Executed land leases are core regulatory and land-rights records."],
  ["Investments/4. Signed WP2 Land Leases/all individual signed lease PDFs", "Files", "Project", "1. Rural Renewable Energy Project (RREP)/05-Regulatory/Land Leases/WP2", "Move files with folder", "The site-by-site signed leases should remain grouped together in the regulatory branch."],
  ["Investments/4. Signed WP2 Land Leases/171106 Inter-ministerial MOU_MOE,MLGRD,MOHS.pdf.28/07/2017", "File", "Project", "1. Rural Renewable Energy Project (RREP)/05-Regulatory/MOUs", "Move file", "Inter-ministerial MOU is a regulatory/government agreement, not a lease."],
  ["Investments/5. Communications & Marketing", "Folder", "Project", "1. Rural Renewable Energy Project (RREP)/00-Business Development/Communications & Marketing", "Move folder", "The project already contains a business-development branch suitable for comms material."],
  ["Investments/5. Communications & Marketing/RREP Project Case Study for WEF.docx", "File", "Project", "1. Rural Renewable Energy Project (RREP)/00-Business Development/Communications & Marketing", "Move file", "This is outward-facing project collateral."],
  ["Investments/6.Building permit", "Folder", "Project", "1. Rural Renewable Energy Project (RREP)/05-Regulatory/Building Permits/WP2", "Move folder", "Construction permits are project regulatory records."],
  ["Investments/6.Building permit/all permit PDFs and ZIP bundles", "Files", "Project", "1. Rural Renewable Energy Project (RREP)/05-Regulatory/Building Permits/WP2", "Move files with folder", "The permit set should remain together, with ZIP files retained only if they are original submission bundles."],
  ["Investments/EUF CapEx and OpEx Survey", "Folder", "Business development", "Sierra Leone Business Development/6 - Pipeline, C&I and Demand Stimulation/C&I/RREP/Pricing/CapEx OpEx Survey", "Copy or shortcut; optionally mirror summary in project finance", "Survey material is valuable for pipeline pricing and benchmarking, but a project finance copy may also be useful."],
  ["Investments/EUF CapEx and OpEx Survey/201401 CAPEX and OPEX Questionnaire_V2-mini-grid.xlsx", "File", "Business development", "Sierra Leone Business Development/6 - Pipeline, C&I and Demand Stimulation/C&I/RREP/Pricing/CapEx OpEx Survey", "Move or copy file", "The workbook supports cost benchmarking and business case development."],
  ["Investments/EUF CapEx and OpEx Survey/Per site data", "Subfolder", "Business development", "Sierra Leone Business Development/6 - Pipeline, C&I and Demand Stimulation/C&I/RREP/Pricing/CapEx OpEx Survey/Per site data", "Move subfolder", "Site-level benchmark data is primarily development-stage costing input."],
  ["Investments/EUF CapEx and OpEx Survey/per portfolio data", "Subfolder", "Business development", "Sierra Leone Business Development/6 - Pipeline, C&I and Demand Stimulation/C&I/RREP/Pricing/CapEx OpEx Survey/Per portfolio data", "Move subfolder", "Portfolio benchmark data is more useful for pipeline and pricing work."],
  ["Investments/EUF CapEx and OpEx Survey/Parking List", "Subfolder", "Business development", "Sierra Leone Business Development/6 - Pipeline, C&I and Demand Stimulation/C&I/RREP/Pricing/CapEx OpEx Survey/Parking List", "Move subfolder", "Open costing questions belong with the survey package."],
  ["Investments/7.Project Final Report", "Folder", "Project", "1. Rural Renewable Energy Project (RREP)/07-Hand Over & Project closing /Final Reports", "Move folder", "Final reporting belongs in project close-out."],
  ["Investments/7.Project Final Report/RREP Endline Evaluation Report May 2022.pdf", "File", "Project", "1. Rural Renewable Energy Project (RREP)/07-Hand Over & Project closing /Final Reports", "Keep original PDF; delete duplicate shortcut after verification", "One row is the real file and one is a shortcut; keep only the authoritative file in the final location."],
  ["Investments/Sierra Leone Bidding & Negotiating Docs", "Folder", "Business development", "Sierra Leone Business Development/1 - UNOPS - PowerGen Bid", "Move folder; keep existing substructure", "This is classic pre-award and proposal history that belongs in business development."],
  ["Investments/Sierra Leone Bidding & Negotiating Docs/1. Tender & Proposal", "Subfolder", "Business development", "Sierra Leone Business Development/1 - UNOPS - PowerGen Bid/1. Tender & Proposal", "Move subfolder", "Proposal records stay in the bid archive."],
  ["Investments/Sierra Leone Bidding & Negotiating Docs/3. Old Work Plans", "Subfolder", "Business development", "Sierra Leone Business Development/1 - UNOPS - PowerGen Bid/3. Old Work Plans", "Move subfolder", "Historic work plans are part of the bid history."],
  ["Investments/Sierra Leone Bidding & Negotiating Docs/4. Document Annexes", "Subfolder", "Business development", "Sierra Leone Business Development/1 - UNOPS - PowerGen Bid/4. Document Annexes", "Move subfolder", "Annex packs belong with the proposal set."],
  ["Investments/overall duplicate handling", "Workstream", "Project and business development", "N/A", "Check for duplicate PDFs, shortcuts, and overlapping finance models before final move", "Several legacy items likely merit copy-or-shortcut treatment rather than a single hard move."],
];

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Migration Map");

const rowCount = rows.length;
sheet.getRange(`A1:F${rowCount}`).values = rows;

sheet.getRange(`A1:F1`).format.fill.color = "#1F4E78";
sheet.getRange(`A1:F1`).format.font.color = "#FFFFFF";
sheet.getRange(`A1:F1`).format.font.bold = true;

sheet.getRange(`A2:A${rowCount}`).format.wrapText = true;
sheet.getRange(`D2:F${rowCount}`).format.wrapText = true;
sheet.getRange(`A1:F${rowCount}`).format.verticalAlignment = "top";

sheet.freezePanes.freezeRows(1);
sheet.getRange(`A1:F${rowCount}`).format.autofitColumns();

const notes = workbook.worksheets.add("Notes");
const noteRows = [
  ["Migration assumptions"],
  ["1. Project-operational, regulatory, permits, leases, reporting, and close-out records were mapped into the live RREP project folder."],
  ["2. Bid history, proposal records, pricing models, and investment-decision history were mapped into Sierra Leone Business Development when they are more valuable as pipeline or deal-history assets."],
  ["3. A few finance and investment items were marked copy or shortcut because they plausibly need to live in both places."],
  ["4. Where the destination subfolder does not yet exist, the path names in this map can be created during migration."],
];
notes.getRange(`A1:A${noteRows.length}`).values = noteRows;
notes.getRange("A1").format.font.bold = true;
notes.getRange(`A1:A${noteRows.length}`).format.wrapText = true;
notes.getRange(`A1:A${noteRows.length}`).format.autofitColumns();

await fs.mkdir(outDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outPath);

console.log(outPath);
