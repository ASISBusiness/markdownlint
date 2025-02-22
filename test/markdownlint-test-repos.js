// @ts-check

"use strict";

const { join } = require("node:path").posix;
const { promisify } = require("node:util");
const jsYaml = require("js-yaml");
const test = require("ava").default;
const markdownlint = require("../lib/markdownlint");
const markdownlintPromise = promisify(markdownlint);
const readConfigPromise = promisify(markdownlint.readConfig);

/**
 * Lints a test repository.
 *
 * @param {Object} t Test instance.
 * @param {string[]} globPatterns Array of files to in/exclude.
 * @param {string} configPath Path to config file.
 * @returns {Promise} Test result.
 */
async function lintTestRepo(t, globPatterns, configPath) {
  t.plan(1);
  const { globby } = await import("globby");
  const { "default": stripJsonComments } = await import("strip-json-comments");
  const jsoncParse = (json) => {
    const config = JSON.parse(stripJsonComments(json));
    return config.config || config;
  };
  const yamlParse = (yaml) => jsYaml.load(yaml);
  return Promise.all([
    globby(globPatterns),
    // @ts-ignore
    readConfigPromise(configPath, [ jsoncParse, yamlParse ])
  ]).then((globbyAndReadConfigResults) => {
    const [ files, rawConfig ] = globbyAndReadConfigResults;
    // eslint-disable-next-line no-console
    console.log(`${t.title}: Linting ${files.length} files...`);
    const config = Object.fromEntries(
      // @ts-ignore
      Object.entries(rawConfig).
        map(([ k, v ]) => [ k.replace(/header/, "heading"), v ])
    );
    return markdownlintPromise({
      files,
      config
    // }).then((results) => {
    //   // Cross-check MD051/link-fragments results with markdown-link-check
    //   const resultFiles = [];
    //   const detectedErrors = new Set();
    //   for (const file of Object.keys(results)) {
    //     const errors =
    //       results[file].filter((error) => error.ruleNames[0] === "MD051");
    //     if (errors.length > 0) {
    //       resultFiles.push(file);
    //     }
    //     for (const error of errors) {
    //       const fragment = error.errorContext.replace(/^.*\((#.*)\)$/, "$1");
    //       detectedErrors.add(file + fragment);
    //     }
    //   }
    //   const { readFile } = require("fs").promises;
    //   const markdownLinkCheck = promisify(require("markdown-link-check"));
    //   const expectedErrors = new Set();
    //   return Promise.all(
    //     resultFiles.map((file) => readFile(file, "utf8")
    //       // @ts-ignore
    //       .then((markdown) => markdownLinkCheck(markdown, {
    //         "ignorePatterns": [
    //           {
    //             "pattern": "^[^#]"
    //           }
    //         ]
    //       }))
    //       .then((mlcResults) => {
    //         const deadResults =
    //           mlcResults.filter((result) => result.status === "dead");
    //         for (const link of deadResults.map((result) => result.link)) {
    //           expectedErrors.add(file + link);
    //         }
    //       })
    //     )
    //   ).then(() => {
    //     const extraErrors = [];
    //     // @ts-ignore
    //     for (const detectedError of detectedErrors) {
    //       if (!expectedErrors.has(detectedError)) {
    //         extraErrors.push(detectedError);
    //       }
    //     }
    //     t.deepEqual(extraErrors, [], "Extra errors");
    //     const missingErrors = [];
    //     // @ts-ignore
    //     for (const expectedError of expectedErrors) {
    //       if (!detectedErrors.has(expectedError)) {
    //         missingErrors.push(expectedError);
    //       }
    //     }
    //     t.deepEqual(missingErrors, [], "Missing errors");
    //     return results;
    //   });
    }).then((results) => {
      // @ts-ignore
      const resultsString = results.toString();
      t.snapshot(
        resultsString,
        "Expected linting violations"
      );
    });
  });
}

/**
 * Excludes a list of globs.
 *
 * @param {string} rootDir Root directory for globs.
 * @param {...string} globs Globs to exclude.
 * @returns {string[]} Array of excluded globs.
 */
function excludeGlobs(rootDir, ...globs) {
  return globs.map((glob) => "!" + join(rootDir, glob));
}

// Run markdownlint the same way the corresponding repositories do

test("https://github.com/apache/airflow", (t) => {
  const rootDir = "./test-repos/apache-airflow";
  const globPatterns = [ join(rootDir, "**/*.{md,mdown,markdown}") ];
  const configPath = join(rootDir, ".markdownlint.yml");
  return lintTestRepo(t, globPatterns, configPath);
});

test("https://github.com/dotnet/docs", (t) => {
  const rootDir = "./test-repos/dotnet-docs";
  const globPatterns = [ join(rootDir, "**/*.md") ];
  const configPath = join(rootDir, ".markdownlint-cli2.jsonc");
  return lintTestRepo(t, globPatterns, configPath);
});

test("https://github.com/electron/electron", (t) => {
  const rootDir = "./test-repos/electron-electron";
  const globPatterns = [
    join(rootDir, "*.md"),
    join(rootDir, "docs/**/*.md")
  ];
  const configPath = join(rootDir, ".markdownlint.json");
  return lintTestRepo(t, globPatterns, configPath);
});

test("https://github.com/eslint/eslint", (t) => {
  const rootDir = "./test-repos/eslint-eslint";
  const globPatterns = [ join(rootDir, "docs/**/*.md") ];
  const configPath = join(rootDir, ".markdownlint.yml");
  return lintTestRepo(t, globPatterns, configPath);
});

test("https://github.com/mdn/content", (t) => {
  const rootDir = "./test-repos/mdn-content";
  const globPatterns = [ join(rootDir, "**/*.md") ];
  const configPath = join(rootDir, ".markdownlint-cli2.jsonc");
  return lintTestRepo(t, globPatterns, configPath);
});

test("https://github.com/mkdocs/mkdocs", (t) => {
  const rootDir = "./test-repos/mkdocs-mkdocs";
  const globPatterns = [
    join(rootDir, "README.md"),
    join(rootDir, "CONTRIBUTING.md"),
    join(rootDir, "docs"),
    ...excludeGlobs(
      rootDir,
      "docs/CNAME",
      "docs/**/*.css",
      "docs/**/*.png",
      "docs/**/*.py",
      "docs/**/*.svg"
    )
  ];
  const configPath = join(rootDir, ".markdownlintrc");
  return lintTestRepo(t, globPatterns, configPath);
});

test("https://github.com/mochajs/mocha", (t) => {
  const rootDir = "./test-repos/mochajs-mocha";
  const globPatterns = [
    join(rootDir, "*.md"),
    join(rootDir, "docs/**/*.md"),
    join(rootDir, ".github/*.md"),
    join(rootDir, "lib/**/*.md"),
    join(rootDir, "test/**/*.md"),
    join(rootDir, "example/**/*.md")
  ];
  const configPath = join(rootDir, ".markdownlint.json");
  return lintTestRepo(t, globPatterns, configPath);
});

test("https://github.com/pi-hole/docs", (t) => {
  const rootDir = "./test-repos/pi-hole-docs";
  const globPatterns = [ join(rootDir, "**/*.md") ];
  const configPath = join(rootDir, ".markdownlint.json");
  return lintTestRepo(t, globPatterns, configPath);
});

test("https://github.com/v8/v8.dev", (t) => {
  const rootDir = "./test-repos/v8-v8-dev";
  const globPatterns = [ join(rootDir, "src/**/*.md") ];
  const configPath = join(rootDir, ".markdownlint.json");
  return lintTestRepo(t, globPatterns, configPath);
});

test("https://github.com/webhintio/hint", (t) => {
  const rootDir = "./test-repos/webhintio-hint";
  const globPatterns = [
    join(rootDir, "**/*.md"),
    ...excludeGlobs(rootDir, "**/CHANGELOG.md")
  ];
  const configPath = join(rootDir, ".markdownlintrc");
  return lintTestRepo(t, globPatterns, configPath);
});

test("https://github.com/webpack/webpack.js.org", (t) => {
  const rootDir = "./test-repos/webpack-webpack-js-org";
  const globPatterns = [ join(rootDir, "**/*.md") ];
  const configPath = join(rootDir, ".markdownlint.json");
  return lintTestRepo(t, globPatterns, configPath);
});
