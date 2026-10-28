/** Preview metadata: parse public prop types and literal options from component sources. */
import ts from "typescript";

import {
  DEFAULT_PREVIEW_BOOLEAN_PROPS,
  DEFAULT_PREVIEW_OPTIONS,
  EXAMPLES,
  PRESENTATION_PREVIEW_KEYS,
  PREVIEW_BOOLEAN_KEYS,
  PREVIEW_OPTION_KEYS,
  ROOT_PRESENTATION_PREVIEW_OPTIONS,
} from "./catalog-data.ts";
import { extractComponentExports } from "./component-exports.ts";
import {
  lookupCatalogValue,
  type UiComponent,
  type UiComponentPreviewMetadata,
} from "./shared.ts";

export function primaryExport(component: UiComponent): string {
  const titleName = component.title.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  return (
    component.exports.find((name) => name.toLowerCase() === titleName) ??
    component.exports.find((name) => name.toLowerCase().endsWith(titleName)) ??
    component.exports[0] ??
    component.title.replace(/[^A-Za-z0-9]/g, "")
  );
}

export function componentExample(component: UiComponent): string {
  return (
    lookupCatalogValue(EXAMPLES, component.importPath) ??
    `<${primaryExport(component)} />`
  );
}

export function usageExport(component: UiComponent, primary: string): string {
  return component.importPath === "components/color-picker"
    ? "ColorPickerPopover"
    : primary;
}

function objectBodies(source: string, property: string): string[] {
  const bodies: string[] = [];
  const pattern = new RegExp(
    `(?:^|\\n)\\s*(?:${property}|["']${property}["'])\\s*:\\s*\\{`,
    "gm",
  );

  for (const match of source.matchAll(pattern)) {
    const start = (match.index ?? 0) + match[0].lastIndexOf("{");
    let depth = 0;
    for (let index = start; index < source.length; index += 1) {
      const character = source[index];
      if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          bodies.push(source.slice(start + 1, index));
          break;
        }
      }
    }
  }
  return bodies;
}

function typeNodeName(node: ts.EntityName): string {
  return ts.isIdentifier(node) ? node.text : node.right.text;
}

function addDirectPropTypes(
  members: readonly ts.TypeElement[],
  propTypes: Map<string, ts.TypeNode[]>,
): void {
  for (const member of members) {
    if (!ts.isPropertySignature(member) || !member.type) {
      continue;
    }
    const propertyName =
      ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)
        ? member.name.text
        : undefined;
    if (!propertyName) {
      continue;
    }
    const existing = propTypes.get(propertyName) ?? [];
    existing.push(member.type);
    propTypes.set(propertyName, existing);
  }
}

function addPropTypesFromType(
  type: ts.Node | undefined,
  aliases: ReadonlyMap<string, ts.TypeNode>,
  propTypes: Map<string, ts.TypeNode[]>,
  seen = new Set<string>(),
): void {
  if (!type) {
    return;
  }
  if (ts.isParenthesizedTypeNode(type)) {
    addPropTypesFromType(type.type, aliases, propTypes, seen);
    return;
  }
  if (ts.isIntersectionTypeNode(type) || ts.isUnionTypeNode(type)) {
    for (const member of type.types) {
      addPropTypesFromType(member, aliases, propTypes, seen);
    }
    return;
  }
  if (ts.isInterfaceDeclaration(type)) {
    addDirectPropTypes(type.members, propTypes);
    return;
  }
  if (ts.isTypeLiteralNode(type)) {
    addDirectPropTypes(type.members, propTypes);
    return;
  }
  if (!ts.isTypeReferenceNode(type)) {
    return;
  }
  const aliasName = typeNodeName(type.typeName);
  const alias = aliases.get(aliasName);
  if (!alias || seen.has(aliasName)) {
    return;
  }
  const nextSeen = new Set(seen);
  nextSeen.add(aliasName);
  addPropTypesFromType(alias, aliases, propTypes, nextSeen);
}

function publicPropTypes(
  source: string,
  targetExport?: string,
): Map<string, ts.TypeNode[]> {
  const sourceFile = ts.createSourceFile(
    "component.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const aliases = new Map<string, ts.TypeNode>();
  const publicComponents = new Set(
    targetExport ? [targetExport] : extractComponentExports(source),
  );
  const propTypes = new Map<string, ts.TypeNode[]>();

  const collectAliases = (node: ts.Node): void => {
    if (ts.isTypeAliasDeclaration(node)) {
      aliases.set(node.name.text, node.type);
    }
    ts.forEachChild(node, collectAliases);
  };
  collectAliases(sourceFile);

  const collectPropContainers = (node: ts.Node): void => {
    if (
      !targetExport &&
      (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
      node.name.text.endsWith("Props")
    ) {
      addPropTypesFromType(
        ts.isTypeAliasDeclaration(node) ? node.type : node,
        aliases,
        propTypes,
      );
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      if (publicComponents.has(node.name.text)) {
        addPropTypesFromType(node.parameters[0]?.type, aliases, propTypes);
      }
    }
    if (ts.isVariableDeclaration(node)) {
      const name = ts.isIdentifier(node.name) ? node.name.text : undefined;
      const initializer = node.initializer;
      if (
        name &&
        publicComponents.has(name) &&
        initializer &&
        (ts.isArrowFunction(initializer) ||
          ts.isFunctionExpression(initializer))
      ) {
        addPropTypesFromType(
          initializer.parameters[0]?.type,
          aliases,
          propTypes,
        );
      }
    }
    ts.forEachChild(node, collectPropContainers);
  };
  collectPropContainers(sourceFile);
  return propTypes;
}

function literalOptionsFromType(
  type: ts.TypeNode | undefined,
  aliases: ReadonlyMap<string, ts.TypeNode>,
  seen = new Set<string>(),
): string[] {
  if (!type) {
    return [];
  }
  if (ts.isParenthesizedTypeNode(type)) {
    return literalOptionsFromType(type.type, aliases, seen);
  }
  if (ts.isUnionTypeNode(type)) {
    return type.types.flatMap((member) =>
      literalOptionsFromType(member, aliases, seen),
    );
  }
  if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
    return [type.literal.text];
  }
  if (ts.isTypeReferenceNode(type)) {
    const aliasName = typeNodeName(type.typeName);
    const alias = aliases.get(aliasName);
    if (!alias || seen.has(aliasName)) {
      return [];
    }
    const nextSeen = new Set(seen);
    nextSeen.add(aliasName);
    return literalOptionsFromType(alias, aliases, nextSeen);
  }
  return [];
}

function extractLiteralOptions(
  source: string,
  property: string,
  targetExport?: string,
): string[] {
  const values = new Set<string>();
  const aliases = new Map<string, ts.TypeNode>();
  const sourceFile = ts.createSourceFile(
    "component.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const collectAliases = (node: ts.Node): void => {
    if (ts.isTypeAliasDeclaration(node)) {
      aliases.set(node.name.text, node.type);
    }
    ts.forEachChild(node, collectAliases);
  };
  collectAliases(sourceFile);

  for (const type of publicPropTypes(source, targetExport).get(property) ??
    []) {
    for (const value of literalOptionsFromType(type, aliases)) {
      values.add(value);
    }
  }

  // Selected roots also own the CVAs named by their actual VariantProps input.
  // Follow only those local declarations, never unrelated sibling slot CVAs.
  const rootVariantOwners = new Set<string>();
  if (targetExport) {
    const collectRootVariantOwners = (node: ts.Node): void => {
      if (
        ts.isTypeReferenceNode(node) &&
        typeNodeName(node.typeName) === "VariantProps"
      ) {
        for (const argument of node.typeArguments ?? []) {
          if (
            ts.isTypeQueryNode(argument) &&
            ts.isIdentifier(argument.exprName)
          ) {
            rootVariantOwners.add(argument.exprName.text);
          }
        }
      }
      ts.forEachChild(node, collectRootVariantOwners);
    };
    for (const statement of sourceFile.statements) {
      if (
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === targetExport &&
        statement.parameters[0]?.type
      ) {
        collectRootVariantOwners(statement.parameters[0].type);
      }
    }
  }
  const variantAuthority = targetExport
    ? sourceFile.statements
        .flatMap((statement) => {
          if (!ts.isVariableStatement(statement)) {
            return [];
          }
          return statement.declarationList.declarations.flatMap(
            (declaration) =>
              ts.isIdentifier(declaration.name) &&
              rootVariantOwners.has(declaration.name.text) &&
              declaration.initializer
                ? [declaration.initializer.getText(sourceFile)]
                : [],
          );
        })
        .join("\n")
    : source;
  for (const variantsBody of objectBodies(variantAuthority, "variants")) {
    for (const propertyBody of objectBodies(variantsBody, property)) {
      const choicesSource = ts.createSourceFile(
        "variant-choices.ts",
        `const choices = {${propertyBody}};`,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const statement = choicesSource.statements[0];
      if (!statement || !ts.isVariableStatement(statement)) {
        continue;
      }
      const choices = statement.declarationList.declarations[0]?.initializer;
      if (!choices || !ts.isObjectLiteralExpression(choices)) {
        continue;
      }
      for (const member of choices.properties) {
        if (
          !ts.isPropertyAssignment(member) &&
          !ts.isShorthandPropertyAssignment(member)
        ) {
          continue;
        }
        const name = member.name;
        if (
          ts.isIdentifier(name) ||
          ts.isStringLiteral(name) ||
          ts.isNumericLiteral(name)
        ) {
          values.add(name.text);
        }
      }
    }
  }

  return [...values]
    .filter((value) => value !== "true" && value !== "false")
    .sort((left, right) => left.localeCompare(right));
}

function hasDeclaredProperty(source: string, property: string): boolean {
  return new RegExp(`(?:^|\\n)\\s*${property}\\?\\s*:\\s*boolean\\b`, "m").test(
    source,
  );
}

export function previewMetadata(
  component: UiComponent,
  source: string,
  variantSources: readonly string[] = [],
): UiComponentPreviewMetadata {
  const props: Record<string, string[]> = {};

  for (const property of PREVIEW_OPTION_KEYS) {
    // The actual Popover Root has no size/variant props. Its Trigger owns
    // those presentation choices; document the named slot without Root controls.
    if (
      component.importPath === "components/popover" &&
      (property === "size" || property === "variant")
    ) {
      continue;
    }
    if (
      PRESENTATION_PREVIEW_KEYS.has(property) &&
      !lookupCatalogValue(
        ROOT_PRESENTATION_PREVIEW_OPTIONS,
        component.importPath,
      )?.includes(property)
    ) {
      continue;
    }
    // Card and Message declare their complete Root presentation props directly.
    // Child-slot props must not become controls on those Root exports.
    const declaredRoot =
      component.importPath === "components/card" ||
      component.importPath === "components/message" ||
      component.importPath === "components/marker"
        ? primaryExport(component)
        : undefined;
    const options = [
      ...new Set(
        [source, ...variantSources].flatMap((authority) =>
          extractLiteralOptions(authority, property, declaredRoot),
        ),
      ),
    ].sort((left, right) => left.localeCompare(right));
    const completeNativeRootChoices =
      (component.importPath === "components/button" &&
        property === "appearance") ||
      (component.importPath === "components/input" && property === "variant");
    if (
      options.length >= 2 &&
      (options.length <= 12 || completeNativeRootChoices)
    ) {
      props[property] = options;
    }
  }

  for (const [property, options] of Object.entries(
    lookupCatalogValue(DEFAULT_PREVIEW_OPTIONS, component.importPath) ?? {},
  )) {
    props[property] = options;
  }

  const booleanProps = new Set(
    lookupCatalogValue(DEFAULT_PREVIEW_BOOLEAN_PROPS, component.importPath) ??
      [],
  );
  for (const property of PREVIEW_BOOLEAN_KEYS) {
    if (hasDeclaredProperty(source, property)) {
      booleanProps.add(property);
    }
  }
  for (const property of booleanProps) {
    props[property] = ["false", "true"];
  }

  return {
    props,
    targetExport: primaryExport(component),
  };
}

export function hasVariantOrSizeOptions(
  preview: UiComponentPreviewMetadata,
): boolean {
  return ["plan", "variant", "size"].some((property) => {
    const options = preview.props[property];
    return options !== undefined && options.length > 1;
  });
}
