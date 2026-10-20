#!/usr/bin/env node
/**
 * Diagnostic Script: Database Connectivity & Read/Write Test
 * 
 * Verifies backend database configuration, filesystem read/write permissions,
 * and performs an end-to-end write and read test to troubleshoot why survey
 * responses might not be saving in production (Hostinger, VPS, Cloud).
 * 
 * Usage:
 *   node scripts/diagnose-db.js
 *   npm run test:db
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Colors for terminal output
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

function logSection(title) {
  console.log(`\n${BOLD}${CYAN}=== [ ${title} ] ===${RESET}`);
}

function logPass(msg, details = '') {
  console.log(` ${GREEN}✔ [PASS]${RESET} ${msg} ${details ? `${GRAY}(${details})${RESET}` : ''}`);
}

function logWarn(msg, details = '') {
  console.log(` ${YELLOW}▲ [WARN]${RESET} ${msg} ${details ? `${GRAY}(${details})${RESET}` : ''}`);
}

function logFail(msg, details = '') {
  console.log(` ${RED}✖ [FAIL]${RESET} ${msg} ${details ? `${GRAY}(${details})${RESET}` : ''}`);
}

async function runDiagnostics() {
  console.log(`${BOLD}====================================================${RESET}`);
  console.log(`${BOLD}  SatisfactionAI / CERT - Database Diagnostic Tool  ${RESET}`);
  console.log(`${BOLD}====================================================${RESET}`);
  console.log(`Timestamp : ${new Date().toISOString()}`);
  console.log(`Host      : ${os.hostname()} (${os.type()} ${os.release()} ${os.arch()})`);
  console.log(`Node.js   : ${process.version}`);
  console.log(`User UID  : ${typeof process.getuid === 'function' ? process.getuid() : 'N/A'}`);
  console.log(`CWD       : ${process.cwd()}`);
  console.log(`Root Dir  : ${projectRoot}`);

  let overallSuccess = true;
  const issues = [];
  const suggestions = [];

  // ----------------------------------------------------
  // 1. Environment Variables & Connection Settings
  // ----------------------------------------------------
  logSection('1. Environment & Configuration Check');

  const envPort = process.env.PORT || '3000 (default)';
  const nodeEnv = process.env.NODE_ENV || 'development (default)';
  const appUrl = process.env.APP_URL || 'Not specified (auto-detected by origin)';
  const dbUrl = process.env.DATABASE_URL || 'Not specified (using local JSON store)';

  console.log(`   NODE_ENV     : ${nodeEnv}`);
  console.log(`   PORT         : ${envPort}`);
  console.log(`   APP_URL      : ${appUrl}`);
  console.log(`   DATABASE_URL : ${dbUrl}`);

  if (process.env.PORT) {
    logPass('PORT environment variable detected', `Port ${process.env.PORT}`);
  } else {
    logWarn('PORT not explicitly defined', 'Using fallback port 3000. On Hostinger, ensure process.env.PORT is respected.');
  }

  // ----------------------------------------------------
  // 2. Database Paths & Directory Resolution
  // ----------------------------------------------------
  logSection('2. Filesystem & Database Path Resolution');

  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dataDir = isVercel ? '/tmp/data' : path.resolve(projectRoot, 'data');
  const dbFile = path.join(dataDir, 'db.json');
  const sourceDbFile = path.resolve(projectRoot, 'data/db.json');

  console.log(`   Target Data Dir : ${dataDir}`);
  console.log(`   Target DB File  : ${dbFile}`);
  console.log(`   Vercel Runtime  : ${isVercel}`);

  // Check Data Directory
  try {
    if (!fs.existsSync(dataDir)) {
      console.log(`   ${GRAY}Data directory does not exist. Attempting to create it...${RESET}`);
      fs.mkdirSync(dataDir, { recursive: true });
      logPass('Created data directory successfully', dataDir);
    } else {
      logPass('Data directory exists', dataDir);
    }

    // Check directory permissions (Read & Write)
    fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
    logPass('Data directory has READ and WRITE permissions');
  } catch (err) {
    overallSuccess = false;
    logFail('Data directory permission issue', err.message);
    issues.push(`Cannot read or write to ${dataDir}`);
    suggestions.push(`Run in terminal: chmod -R 775 "${dataDir}"`);
  }

  // ----------------------------------------------------
  // 3. Database File Existence & Integrity Check
  // ----------------------------------------------------
  logSection('3. Database File Existence & Validation');

  let currentDb = null;
  let fileStats = null;

  try {
    if (!fs.existsSync(dbFile)) {
      if (fs.existsSync(sourceDbFile) && sourceDbFile !== dbFile) {
        fs.copyFileSync(sourceDbFile, dbFile);
        logPass('Initialized db.json from source seed file');
      } else {
        logWarn('db.json does not exist yet', 'A new one will be created during write test');
      }
    }

    if (fs.existsSync(dbFile)) {
      fileStats = fs.statSync(dbFile);
      logPass('db.json exists on disk', `${fileStats.size} bytes, modified: ${fileStats.mtime.toISOString()}`);

      // Check file permissions
      fs.accessSync(dbFile, fs.constants.R_OK | fs.constants.W_OK);
      logPass('db.json has READ and WRITE permissions');

      // Test JSON parsing
      const rawContent = fs.readFileSync(dbFile, 'utf-8');
      if (rawContent.trim().length === 0) {
        logWarn('db.json is empty');
      } else {
        currentDb = JSON.parse(rawContent);
        logPass('db.json contains valid JSON format');

        const surveyCount = Array.isArray(currentDb.surveys) ? currentDb.surveys.length : 0;
        const submissionCount = Array.isArray(currentDb.submissions) ? currentDb.submissions.length : 0;
        const complaintCount = Array.isArray(currentDb.complaints) ? currentDb.complaints.length : 0;

        console.log(`   Surveys in DB     : ${BOLD}${surveyCount}${RESET}`);
        console.log(`   Submissions in DB : ${BOLD}${submissionCount}${RESET}`);
        console.log(`   Complaints in DB  : ${BOLD}${complaintCount}${RESET}`);

        if (submissionCount === 0) {
          logWarn('Submissions count is currently 0', 'Ensure survey respondents are reaching this server and not getting 404 on /api/answers.');
        } else {
          logPass('Existing submissions found in database', `${submissionCount} submissions recorded`);
        }
      }
    }
  } catch (err) {
    overallSuccess = false;
    logFail('Failed to read or parse db.json', err.message);
    issues.push(`db.json parse/permission error: ${err.message}`);
    suggestions.push(`Verify file permissions: chmod 664 "${dbFile}"`);
  }

  // ----------------------------------------------------
  // 4. Live End-to-End Write & Read Verification Test
  // ----------------------------------------------------
  logSection('4. Live End-to-End Database Write / Read Test');

  const testId = `diag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const testEntry = {
    testId,
    timestamp: new Date().toISOString(),
    source: 'diagnostic-script',
    note: 'Temporary record verifying database backend connectivity',
  };

  try {
    // Step A: Load or initialize memory store
    let storeToTest = currentDb || {
      surveys: [],
      submissions: [],
      complaints: [],
      notifications: [],
      diagnosticLogs: [],
    };

    if (!Array.isArray(storeToTest.diagnosticLogs)) {
      storeToTest.diagnosticLogs = [];
    }

    // Append diagnostic record
    storeToTest.diagnosticLogs.push(testEntry);

    // Keep only last 5 diagnostic logs to avoid bloating
    if (storeToTest.diagnosticLogs.length > 5) {
      storeToTest.diagnosticLogs = storeToTest.diagnosticLogs.slice(-5);
    }

    // Step B: Write to disk (atomic write via temp file then rename for safety)
    const writeStart = Date.now();
    const tempFile = `${dbFile}.tmp.${Date.now()}`;
    const serialized = JSON.stringify(storeToTest, null, 2);

    fs.writeFileSync(tempFile, serialized, 'utf-8');
    fs.renameSync(tempFile, dbFile);
    const writeDuration = Date.now() - writeStart;

    logPass(`Physical WRITE test completed successfully`, `took ${writeDuration}ms`);

    // Step C: Read back freshly from disk (bypassing any in-memory cache)
    const readStart = Date.now();
    const freshlyReadRaw = fs.readFileSync(dbFile, 'utf-8');
    const readDuration = Date.now() - readStart;
    const freshlyParsed = JSON.parse(freshlyReadRaw);

    logPass(`Physical READ test completed successfully`, `took ${readDuration}ms`);

    // Step D: Assert that the test entry exists in the freshly read file
    const foundEntry = freshlyParsed.diagnosticLogs?.find((item) => item.testId === testId);

    if (foundEntry) {
      logPass('Data integrity verification PASSED', `Entry ID ${testId} was successfully persisted and verified.`);
    } else {
      overallSuccess = false;
      logFail('Data integrity verification FAILED', 'Written entry was not found in read file.');
      issues.push('Atomic write did not preserve the written entry.');
    }
  } catch (err) {
    overallSuccess = false;
    logFail('Live write/read test threw an exception', err.message);
    issues.push(`Write/Read exception: ${err.message}`);
    suggestions.push(`Check if the current Linux user has write access to "${dataDir}"`);
  }

  // ----------------------------------------------------
  // 5. Common Production Pitfalls Checklist (Hostinger)
  // ----------------------------------------------------
  logSection('5. Hostinger Production Checklist');

  console.log(`   [✓] Startup File       : Must be set to ${BOLD}app.js${RESET} or ${BOLD}server.js${RESET} in Hostinger Node.js UI`);
  console.log(`   [✓] Node Version       : Recommended Node.js 18.x or 20.x`);
  console.log(`   [✓] Static Assets      : "dist/" directory must be built (run ${BOLD}npm run build${RESET})`);
  console.log(`   [✓] Data Folder        : Must exist with write permissions (${BOLD}chmod -R 775 data${RESET})`);
  console.log(`   [✓] API Routing        : Ensure Apache/Nginx forwards /api/* to the Node.js port`);

  // ----------------------------------------------------
  // Summary & Next Steps
  // ----------------------------------------------------
  logSection('Summary & Diagnostic Results');

  if (overallSuccess) {
    console.log(`\n${GREEN}${BOLD}✔ DATABASE BACKEND CONNECTIVITY IS HEALTHY AND OPERATIONAL!${RESET}`);
    console.log(`The server has full permission to read, write, and persist survey results to disk.`);
    console.log(`\n${CYAN}If survey results are not showing in your browser dashboard:${RESET}`);
    console.log(`1. Ensure your browser client points to this server and not an unhandled static route.`);
    console.log(`2. Verify that network requests to "/api/answers" in your browser DevTools (F12) return HTTP 200/201 and not HTTP 404.`);
    console.log(`3. Check that the Node.js application is actively running (Status: Started in Hostinger hPanel).`);
  } else {
    console.log(`\n${RED}${BOLD}✖ DATABASE DIAGNOSTIC DETECTED ISSUES:${RESET}`);
    issues.forEach((iss, i) => console.log(`  ${i + 1}. ${iss}`));

    console.log(`\n${YELLOW}${BOLD}Recommended Action Steps:${RESET}`);
    suggestions.forEach((sug, i) => console.log(`  ${i + 1}. ${sug}`));
  }

  console.log(`\n${BOLD}====================================================${RESET}\n`);

  process.exit(overallSuccess ? 0 : 1);
}

runDiagnostics().catch((err) => {
  console.error('Unexpected error running database diagnostic:', err);
  process.exit(1);
});
