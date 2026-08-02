import { existsSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

type ExpoConfigFile = {
  expo: {
    name: string;
    slug: string;
    version: string;
    icon: string;
    scheme: string;
    android?: {
      package?: string;
      versionCode?: number;
      adaptiveIcon?: {
        foregroundImage?: string;
        backgroundColor?: string;
      };
    };
    web?: {
      favicon?: string;
    };
    plugins?: unknown[];
  };
};

describe("release configuration", () => {
  it("keeps the production Android package, version and asset paths", () => {
    const config = readJson<ExpoConfigFile>("app.json").expo;

    expect(config.name).toBe("Money Heist");
    expect(config.slug).toBe("money-heist");
    expect(config.scheme).toBe("moneyheist");
    expect(config.version).toBe("1.0.0");
    expect(config.android?.package).toBe("com.rafaelrafin007.moneyheist");
    expect(config.android?.package).not.toBe("com.example.moneyheist");
    expect(config.android?.versionCode).toBeGreaterThanOrEqual(1);
    expect(assetExists(config.icon)).toBe(true);
    expect(assetExists(config.android?.adaptiveIcon?.foregroundImage ?? "")).toBe(true);
    expect(assetExists(config.web?.favicon ?? "")).toBe(true);
    expect(JSON.stringify(config.plugins)).toContain("splash-icon.png");
  });

  it("keeps local environment files ignored and excludes service-role credentials from active client source", () => {
    const gitignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8");
    const sourceFiles = [
      ...listFiles(join(process.cwd(), "app")),
      ...listFiles(join(process.cwd(), "src")),
    ];
    const activeSource = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");

    expect(gitignore).toMatch(/^\.env$/m);
    expect(gitignore).toMatch(/^\.env\.\*$/m);
    expect(gitignore).toMatch(/^!\.env\.example$/m);
    expect(activeSource).not.toMatch(/service_role/i);
  });
});

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), relativePath), "utf8")) as T;
}

function assetExists(assetPath: string) {
  return existsSync(join(process.cwd(), assetPath.replace(/^\.\//, "")));
}

function listFiles(directory: string): string[] {
  return readDirectory(directory).flatMap((entry) => {
    if (entry.isDirectory()) {
      return listFiles(join(directory, entry.name));
    }
    const fullPath = join(directory, entry.name);
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !fullPath.includes(`${join("src", "features", "release", "__tests__")}`)
      ? [fullPath]
      : [];
  });
}

function readDirectory(directory: string) {
  return readdirSync(directory, { withFileTypes: true }) as Dirent[];
}
