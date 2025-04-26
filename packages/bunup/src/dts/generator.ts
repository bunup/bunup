import { type OxcError, isolatedDeclaration } from "oxc-transform";
import pc from "picocolors";
import { BunupIsolatedDeclError, parseErrorMessage } from "../errors";
import { logger } from "../logger";
import { getShortFilePath } from "../utils";

const allErrors: {
    error: OxcError;
    sourceText: string;
    tsFile: string;
}[] = [];

export async function generateDtsContent(
    tsFile: string,
): Promise<string | null> {
    try {
        const sourceText = await Bun.file(tsFile).text();

        const { code: declaration, errors } = isolatedDeclaration(
            tsFile,
            sourceText,
        );

        for (const error of errors) {
            allErrors.push({
                error,
                sourceText,
                tsFile,
            });
        }

        return declaration;
    } catch (error) {
        console.log(error);
        logger.warn(
            `Failed to generate declaration for ${tsFile}: ${parseErrorMessage(error)}`,
        );
        return null;
    }
}

export function runPostDtsValidation(isWatching: boolean): void {
    let hasErrors = false;

    for (const { error, sourceText, tsFile } of allErrors) {
        if (!hasErrors && !isWatching) {
            console.log("\n");
        }
        const label = error.labels[0];
        const position = label
            ? calculateDtsErrorLineAndColumn(sourceText, label.start)
            : "";

        const shortPath = getShortFilePath(tsFile);
        const errorMessage = `${shortPath}${position}: ${formatDtsErrorMessage(error.message)}`;

        logger[isWatching ? "warn" : "error"](errorMessage);
        hasErrors = true;
    }

    if (hasErrors && !isWatching) {
        console.log("\n");
        console.log(
            pc.gray(
                `See ${pc.blue(
                    "https://bunup.dev/docs/troubleshooting/explicit-type-annotation-errors",
                )} for details.`,
            ),
        );
        console.log("\n");
        throw new BunupIsolatedDeclError();
    }
}

function calculateDtsErrorLineAndColumn(
    sourceText: string,
    labelStart: number,
): string {
    if (labelStart === undefined) return "";

    const lines = sourceText.slice(0, labelStart).split("\n");
    const lineNumber = lines.length;
    const columnStart = lines[lines.length - 1].length + 1;

    return ` (${lineNumber}:${columnStart})`;
}

function formatDtsErrorMessage(errorMessage: string): string {
    return errorMessage
        .replace(" with --isolatedDeclarations", "")
        .replace(" with --isolatedDeclaration", "");
}
