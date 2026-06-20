import type { ReactNode } from "react";
import useBaseUrl from "@docusaurus/useBaseUrl";
import CodeBlock from "@theme/CodeBlock";
import Layout from "@theme/Layout";
import { useEffect, useMemo, useRef, useState } from "react";

type ApiManifestPackage = {
  name: string;
  description: string;
  currentVersion: string;
  latest: string;
  defaultVersion: string;
  versions: string[];
  files: Record<string, string>;
};

type ApiManifest = {
  defaultPackage: string;
  packages: Record<string, ApiManifestPackage>;
};

type TypeDocType = {
  type: string;
  name?: string;
  value?: string | number | boolean | null;
  checkType?: TypeDocType;
  extendsType?: TypeDocType;
  trueType?: TypeDocType;
  falseType?: TypeDocType;
  elementType?: TypeDocType;
  types?: TypeDocType[];
  typeArguments?: TypeDocType[];
  target?: number | {
    packageName?: string;
    packagePath?: string;
    qualifiedName?: string;
  };
  package?: string;
  qualifiedName?: string;
  declaration?: TypeDocReflection;
};

type TypeDocCommentPart = {
  kind?: string;
  tag?: string;
  text?: string;
  target?: number | {
    packageName?: string;
    packagePath?: string;
    qualifiedName?: string;
  };
};

type TypeDocReflection = {
  id: number;
  name: string;
  kind?: number;
  flags?: {
    isOptional?: boolean;
    isReadonly?: boolean;
    isStatic?: boolean;
    isPrivate?: boolean;
    isProtected?: boolean;
  };
  comment?: {
    summary?: TypeDocCommentPart[];
    blockTags?: Array<{ tag: string; content?: TypeDocCommentPart[] }>;
  };
  type?: TypeDocType;
  extendedTypes?: TypeDocType[];
  extendedBy?: TypeDocType[];
  implementedTypes?: TypeDocType[];
  typeParameters?: TypeDocReflection[];
  parameters?: TypeDocReflection[];
  signatures?: TypeDocReflection[];
  children?: TypeDocReflection[];
  sources?: Array<{ fileName: string; line: number; url?: string }>;
};

const KIND_NAMES: Record<number, string> = {
  1: "Project",
  2: "Module",
  4: "Namespace",
  8: "Enumeration",
  16: "Enumeration Member",
  32: "Variable",
  64: "Function",
  128: "Class",
  256: "Interface",
  512: "Constructor",
  1024: "Property",
  2048: "Method",
  4096: "Call Signature",
  8192: "Index Signature",
  16384: "Constructor Signature",
  32768: "Parameter",
  65536: "Type Literal",
  131072: "Type Parameter",
  262144: "Accessor",
  2097152: "Type Alias",
  4194304: "Type Alias",
};

const TOP_LEVEL_KINDS = new Set([8, 32, 64, 128, 256, 2097152, 4194304]);
const MEMBER_KINDS = new Set([512, 1024, 2048, 262144]);
const ENUM_MEMBER_KIND = 16;
const TYPE_ALIAS_KINDS = new Set([2097152, 4194304]);

function kindName(reflection: TypeDocReflection): string {
  return reflection.kind ? (KIND_NAMES[reflection.kind] ?? "Symbol") : "Symbol";
}

function commentText(reflection: TypeDocReflection | undefined): string {
  return reflection?.comment?.summary?.map(part => part.text ?? "").join("").trim() ?? "";
}

function hasComment(reflection: TypeDocReflection | undefined): boolean {
  return commentText(reflection).length > 0;
}

function primarySignature(reflection: TypeDocReflection | undefined): TypeDocReflection | undefined {
  return reflection?.signatures?.[0] ?? reflection;
}

function displayCommentParts(reflection: TypeDocReflection | undefined): TypeDocCommentPart[] {
  return hasComment(reflection)
    ? reflection?.comment?.summary ?? []
    : primarySignature(reflection)?.comment?.summary ?? [];
}

function displayComment(reflection: TypeDocReflection | undefined): string {
  return commentText(reflection) || commentText(primarySignature(reflection));
}

function blockTagText(reflection: TypeDocReflection | undefined, tag: string): string[] {
  return reflection?.comment?.blockTags
    ?.filter(blockTag => blockTag.tag === tag)
    .map(blockTag => blockTag.content?.map(part => part.text ?? "").join("").trim() ?? "")
    .filter(Boolean) ?? [];
}

function topLevelSymbols(api: TypeDocReflection | null): TypeDocReflection[] {
  return (api?.children ?? [])
    .filter(child => child.kind && TOP_LEVEL_KINDS.has(child.kind))
    .sort((a, b) => {
      const groupDiff = kindName(a).localeCompare(kindName(b));
      return groupDiff || a.name.localeCompare(b.name);
    });
}

function groupedSymbols(symbols: TypeDocReflection[]): Array<[string, TypeDocReflection[]]> {
  const groups = new Map<string, TypeDocReflection[]>();

  for (const symbol of symbols) {
    const group = kindName(symbol);
    groups.set(group, [...(groups.get(group) ?? []), symbol]);
  }

  return Array.from(groups.entries());
}

function possibleTypesFromConditional(type: TypeDocType): TypeDocType[] {
  const types = [type.trueType, type.falseType]
    .filter((part): part is TypeDocType => Boolean(part))
    .flatMap(part => part.type === "union" ? part.types ?? [] : [part]);
  const seen = new Set<string>();

  return types.filter((part) => {
    const key = typeText(part);
    if (seen.has(key))
      return false;
    seen.add(key);
    return true;
  });
}

function typeText(type: TypeDocType | undefined): string {
  if (!type)
    return "void";

  switch (type.type) {
    case "array":
      return `${typeText(type.elementType)}[]`;
    case "conditional":
      return possibleTypesFromConditional(type).map(typeText).join(" | ") || "unknown";
    case "indexedAccess":
      return "indexed access";
    case "inferred":
    case "intrinsic":
    case "reference":
    case "templateLiteral":
      return `${String(type.name ?? type.value ?? type.qualifiedName ?? "unknown")}${type.typeArguments?.length ? `<${type.typeArguments.map(typeText).join(", ")}>` : ""}`;
    case "literal":
      return type.value === null ? "null" : String(type.value ?? type.name ?? "unknown");
    case "intersection":
      return type.types?.map(typeText).join(" & ") ?? "unknown";
    case "reflection":
      return type.declaration?.children
        ? `{ ${type.declaration.children.map(child => `${child.name}: ${typeText(child.type)}`).join("; ")} }`
        : "object";
    case "tuple":
      return `[${type.types?.map(typeText).join(", ") ?? ""}]`;
    case "union":
      return type.types?.map(typeText).join(" | ") ?? "unknown";
    default:
      return type.name ?? type.type;
  }
}

function typeParamsText(reflection: TypeDocReflection): string {
  return reflection.typeParameters?.length
    ? `<${reflection.typeParameters.map(param => param.name).join(", ")}>`
    : "";
}

function membersOf(symbol: TypeDocReflection | undefined): TypeDocReflection[] {
  return symbol?.children?.filter(child => child.kind && MEMBER_KINDS.has(child.kind)) ?? [];
}

function buildReflectionMap(api: TypeDocReflection | null): Map<number, TypeDocReflection> {
  const map = new Map<number, TypeDocReflection>();

  function walk(reflection: TypeDocReflection | undefined): void {
    if (!reflection)
      return;
    map.set(reflection.id, reflection);
    for (const child of reflection.children ?? []) walk(child);
    for (const signature of reflection.signatures ?? []) walk(signature);
    for (const parameter of reflection.parameters ?? []) walk(parameter);
    walk(reflection.type?.declaration);
  }

  walk(api ?? undefined);
  return map;
}

function membersFromType(
  type: TypeDocType | undefined,
  reflectionMap: Map<number, TypeDocReflection>,
  visited = new Set<number>(),
): TypeDocReflection[] {
  if (!type)
    return [];

  if (type.type === "reflection") {
    return type.declaration?.children?.filter(child => child.kind === 1024 || child.kind === 2048) ?? [];
  }

  if (type.type === "intersection") {
    return type.types?.flatMap(part => membersFromType(part, reflectionMap, visited)) ?? [];
  }

  if (type.type === "reference" && typeof type.target === "number") {
    if (visited.has(type.target))
      return [];
    visited.add(type.target);
    const target = reflectionMap.get(type.target);
    return [
      ...membersOf(target),
      ...membersFromType(target?.type, reflectionMap, visited),
    ];
  }

  return [];
}

function displayMembers(
  symbol: TypeDocReflection | undefined,
  reflectionMap: Map<number, TypeDocReflection>,
): TypeDocReflection[] {
  if (!symbol)
    return [];
  const members = symbol.kind === 8
    ? symbol.children?.filter(child => child.kind === ENUM_MEMBER_KIND) ?? []
    : symbol.kind && TYPE_ALIAS_KINDS.has(symbol.kind)
      ? [...membersOf(symbol), ...membersFromType(symbol.type, reflectionMap)]
      : membersOf(symbol);
  const seen = new Set<string>();

  return members.filter((member) => {
    const key = `${member.name}:${typeText(member.type)}`;
    if (seen.has(key))
      return false;
    seen.add(key);
    return true;
  });
}

function membersTitle(symbol: TypeDocReflection): string {
  if (symbol.kind === 8)
    return "Enum members";
  if (symbol.kind && TYPE_ALIAS_KINDS.has(symbol.kind))
    return "Properties";
  return "Members";
}

function shouldShowSignature(reflection: TypeDocReflection): boolean {
  if (reflection.kind === 8)
    return false;
  return Boolean(
    reflection.kind === 128
    || reflection.kind === 256
    || (reflection.kind && TYPE_ALIAS_KINDS.has(reflection.kind) && membersOf(reflection).length > 0)
    || reflection.type
    || reflection.signatures?.length,
  );
}

function relatedTypes(symbol: TypeDocReflection | undefined): Array<[string, TypeDocType[]]> {
  if (!symbol)
    return [];
  return [
    ["Extends", symbol.extendedTypes ?? []],
    ["Implements", symbol.implementedTypes ?? []],
    ["Extended by", symbol.extendedBy ?? []],
  ].filter((entry): entry is [string, TypeDocType[]] => entry[1].length > 0);
}

function selectInitialSymbol(symbols: TypeDocReflection[], selectedId: number | null): number | null {
  if (selectedId && symbols.some(symbol => symbol.id === selectedId))
    return selectedId;
  return symbols.find(symbol => symbol.name === "ArcClient")?.id ?? symbols[0]?.id ?? null;
}

function scrollApiContentToTop(): void {
  requestAnimationFrame(() => window.scrollTo({ top: 0 }));
}

function urlSymbolName(): string {
  if (typeof window === "undefined")
    return "";
  return decodeURIComponent(window.location.hash.replace(/^#/, ""));
}

function resolveUrlSelection(manifest: ApiManifest): { packageSlug: string; version: string; symbolName: string } {
  const params = new URLSearchParams(window.location.search);
  const requestedPackage = params.get("package") ?? params.get("pkg") ?? manifest.defaultPackage;
  const packageSlug = manifest.packages[requestedPackage] ? requestedPackage : manifest.defaultPackage;
  const pkg = manifest.packages[packageSlug];
  const requestedVersion = params.get("version") ?? "main";
  const version = requestedVersion === "main" || !pkg.versions.includes(requestedVersion)
    ? pkg.defaultVersion
    : requestedVersion;

  return {
    packageSlug,
    version,
    symbolName: urlSymbolName(),
  };
}

function writeApiUrl(
  manifest: ApiManifest,
  packageSlug: string,
  version: string,
  symbolName: string | undefined,
  mode: "push" | "replace",
): void {
  const pkg = manifest.packages[packageSlug];
  if (!pkg)
    return;

  const params = new URLSearchParams();
  params.set("package", packageSlug);
  params.set("version", version === pkg.defaultVersion ? "main" : version);
  const hash = symbolName ? `#${encodeURIComponent(symbolName)}` : "";
  const nextUrl = `${window.location.pathname}?${params.toString()}${hash}`;

  if (`${window.location.pathname}${window.location.search}${window.location.hash}` === nextUrl)
    return;
  window.history[mode === "push" ? "pushState" : "replaceState"](null, "", nextUrl);
}

function buildTopLevelOwnerMap(api: TypeDocReflection | null): Map<number, number> {
  const map = new Map<number, number>();

  function walk(reflection: TypeDocReflection, ownerId: number): void {
    map.set(reflection.id, ownerId);
    for (const child of reflection.children ?? []) {
      walk(child, ownerId);
      for (const signature of child.signatures ?? []) {
        walk(signature, ownerId);
      }
    }
    for (const signature of reflection.signatures ?? []) {
      walk(signature, ownerId);
    }
  }

  for (const symbol of topLevelSymbols(api)) {
    walk(symbol, symbol.id);
  }

  return map;
}

function buildTopLevelNameMap(symbols: TypeDocReflection[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const symbol of symbols) {
    map.set(symbol.name, symbol.id);
    map.set(symbol.name.toLowerCase(), symbol.id);
  }

  return map;
}

function inlineLinkOwnerId(
  part: TypeDocCommentPart,
  ownerMap: Map<number, number>,
  nameMap: Map<string, number>,
): number | undefined {
  if (part.kind !== "inline-tag" || part.tag !== "@link")
    return undefined;

  if (typeof part.target === "number")
    return ownerMap.get(part.target);

  const qualifiedName = typeof part.target === "object" ? part.target.qualifiedName : undefined;
  const candidates = [
    part.text,
    qualifiedName,
    lastSegment(qualifiedName, "."),
    lastSegment(qualifiedName, "/"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const exact = nameMap.get(candidate);
    if (exact)
      return exact;
    const normalized = nameMap.get(candidate.toLowerCase());
    if (normalized)
      return normalized;
  }

  return undefined;
}

function internalPackageName(type: TypeDocType): string | undefined {
  return typeof type.target === "object"
    ? type.target.packageName ?? type.package
    : type.package;
}

function isArcscordReference(type: TypeDocType): boolean {
  const packageName = internalPackageName(type);
  return !packageName || packageName === "arcscord" || packageName.startsWith("@arcscord/");
}

function lastSegment(value: string | undefined, separator: string): string | undefined {
  if (!value)
    return undefined;
  const parts = value.split(separator);
  return parts[parts.length - 1];
}

function internalReferenceOwnerId(
  type: TypeDocType,
  ownerMap: Map<number, number>,
  nameMap: Map<string, number>,
): number | undefined {
  if (type.type !== "reference")
    return undefined;
  if (typeof type.target === "number")
    return ownerMap.get(type.target);
  if (!isArcscordReference(type))
    return undefined;

  const qualifiedName = typeof type.target === "object" ? type.target.qualifiedName : type.qualifiedName;
  const candidates = [
    type.name,
    type.qualifiedName,
    qualifiedName,
    lastSegment(qualifiedName, "."),
    lastSegment(qualifiedName, "/"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const exact = nameMap.get(candidate);
    if (exact)
      return exact;
    const normalized = nameMap.get(candidate.toLowerCase());
    if (normalized)
      return normalized;
  }

  return undefined;
}

function externalTypeUrl(type: TypeDocType): string | undefined {
  if (typeof type.target !== "object")
    return undefined;
  const packageName = type.target.packageName ?? type.package;
  if (packageName === "discord.js")
    return "https://discord.js.org/docs/packages/discord.js/main";
  if (packageName === "discord-api-types")
    return "https://discord-api-types.dev/api/discord-api-types-v10";
  return undefined;
}

function externalTypeLabel(type: TypeDocType): string {
  const packageName = typeof type.target === "object" ? type.target.packageName ?? type.package : type.package;
  if (packageName === "discord.js")
    return "d.js";
  if (packageName === "discord-api-types")
    return "api";
  return "";
}

function parseFencedCode(markdown: string): { language: string; code: string } | undefined {
  const match = markdown.trim().match(/^```(\w+)?\n([\s\S]*?)\n```$/);
  if (!match)
    return undefined;
  return {
    language: match[1] || "ts",
    code: match[2],
  };
}

function ExampleBlock({ example }: { example: string }): ReactNode {
  const fencedCode = parseFencedCode(example);

  if (fencedCode) {
    return (
      <CodeBlock className={`language-${fencedCode.language}`}>
        {fencedCode.code}
      </CodeBlock>
    );
  }

  return <CodeBlock>{example}</CodeBlock>;
}

function CommentView({
  reflection,
  ownerMap,
  nameMap,
  onSelectSymbol,
}: {
  reflection: TypeDocReflection | undefined;
  ownerMap: Map<number, number>;
  nameMap: Map<string, number>;
  onSelectSymbol: (id: number) => void;
}): ReactNode {
  return (
    <>
      {displayCommentParts(reflection).map((part, index) => {
        if (part.kind !== "inline-tag" || part.tag !== "@link")
          return <span key={index}>{part.text ?? ""}</span>;

        const ownerId = inlineLinkOwnerId(part, ownerMap, nameMap);
        const label = part.text || "link";

        if (!ownerId)
          return <span key={index}>{label}</span>;

        return (
          <button
            key={index}
            className="api-comment-link"
            type="button"
            onClick={() => onSelectSymbol(ownerId)}
          >
            {label}
          </button>
        );
      })}
    </>
  );
}

function TypeView({
  type,
  ownerMap,
  nameMap,
  onSelectSymbol,
}: {
  type: TypeDocType | undefined;
  ownerMap: Map<number, number>;
  nameMap: Map<string, number>;
  onSelectSymbol: (id: number) => void;
}): ReactNode {
  if (!type)
    return <span className="api-type api-type--intrinsic">void</span>;

  if (type.type === "array") {
    return (
      <>
        <TypeView type={type.elementType} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={onSelectSymbol} />
        <span className="api-type">[]</span>
      </>
    );
  }

  if (type.type === "conditional") {
    const possibleTypes = possibleTypesFromConditional(type);
    const title = type.checkType && type.extendsType
      ? `${typeText(type.checkType)} extends ${typeText(type.extendsType)} ? ${typeText(type.trueType)} : ${typeText(type.falseType)}`
      : undefined;

    return (
      <span title={title}>
        {possibleTypes.map((part, index) => (
          <span key={index}>
            {index > 0 && <span className="api-type api-type--operator"> | </span>}
            <TypeView type={part} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={onSelectSymbol} />
          </span>
        ))}
        {possibleTypes.length === 0 && <span className="api-type">unknown</span>}
      </span>
    );
  }

  if (type.type === "union" || type.type === "intersection") {
    const separator = type.type === "union" ? " | " : " & ";
    return (
      <>
        {type.types?.map((part, index) => (
          <span key={index}>
            {index > 0 && <span className="api-type api-type--operator">{separator}</span>}
            <TypeView type={part} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={onSelectSymbol} />
          </span>
        )) ?? <span className="api-type">unknown</span>}
      </>
    );
  }

  if (type.type === "tuple") {
    return (
      <span>
        <span className="api-type api-type--operator">[</span>
        {type.types?.map((part, index) => (
          <span key={index}>
            {index > 0 && <span className="api-type api-type--operator">, </span>}
            <TypeView type={part} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={onSelectSymbol} />
          </span>
        ))}
        <span className="api-type api-type--operator">]</span>
      </span>
    );
  }

  if (type.type === "reflection" && type.declaration?.children) {
    return <span className="api-type api-type--object">{typeText(type)}</span>;
  }

  if (type.type === "reference") {
    const label = type.name ?? type.qualifiedName ?? "unknown";
    const ownerId = internalReferenceOwnerId(type, ownerMap, nameMap);
    const externalUrl = externalTypeUrl(type);
    const typeArguments = type.typeArguments?.length
      ? (
          <>
            <span className="api-type api-type--operator">&lt;</span>
            {type.typeArguments.map((arg, index) => (
              <span key={index}>
                {index > 0 && <span className="api-type api-type--operator">, </span>}
                <TypeView type={arg} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={onSelectSymbol} />
              </span>
            ))}
            <span className="api-type api-type--operator">&gt;</span>
          </>
        )
      : null;

    if (ownerId) {
      return (
        <>
          <button className="api-type api-type--reference" type="button" onClick={() => onSelectSymbol(ownerId)}>{label}</button>
          {typeArguments}
        </>
      );
    }

    if (externalUrl) {
      const packageName = internalPackageName(type) ?? "external package";
      return (
        <>
          <a className="api-type api-type--external" href={externalUrl} title={`${label} from ${packageName}`}>
            {label}
            <span className="api-type__vendor">{externalTypeLabel(type)}</span>
            <svg className="api-type__external-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
          {typeArguments}
        </>
      );
    }

    return (
      <>
        <span className="api-type api-type--reference">{label}</span>
        {typeArguments}
      </>
    );
  }

  if (type.type === "literal") {
    return <span className="api-type api-type--literal">{String(type.value)}</span>;
  }

  return <span className={`api-type api-type--${type.type}`}>{typeText(type)}</span>;
}

function SignatureView({
  reflection,
  ownerMap,
  nameMap,
  onSelectSymbol,
}: {
  reflection: TypeDocReflection;
  ownerMap: Map<number, number>;
  nameMap: Map<string, number>;
  onSelectSymbol: (id: number) => void;
}): ReactNode {
  const signature = primarySignature(reflection) ?? reflection;

  if (reflection.kind && TYPE_ALIAS_KINDS.has(reflection.kind)) {
    return (
      <>
        <span className="api-token api-token--keyword">type</span>
        {" "}
        <span className="api-token api-token--name">{reflection.name}</span>
        {typeParamsText(reflection)}
        <span className="api-token api-token--operator"> = </span>
        {reflection.type
          ? <TypeView type={reflection.type} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={onSelectSymbol} />
          : <span className="api-type api-type--object">{"{ ... }"}</span>}
      </>
    );
  }

  if (reflection.kind === 128 || reflection.kind === 256) {
    return (
      <>
        <span className="api-token api-token--keyword">{kindName(reflection).toLowerCase()}</span>
        {" "}
        <span className="api-token api-token--name">{reflection.name}</span>
        {typeParamsText(reflection)}
        {reflection.extendedTypes?.length
          ? (
              <>
                {" "}
                <span className="api-token api-token--keyword">extends</span>
                {" "}
                {reflection.extendedTypes.map((type, index) => (
                  <span key={index}>
                    {index > 0 && ", "}
                    <TypeView type={type} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={onSelectSymbol} />
                  </span>
                ))}
              </>
            )
          : null}
        {reflection.implementedTypes?.length
          ? (
              <>
                {" "}
                <span className="api-token api-token--keyword">implements</span>
                {" "}
                {reflection.implementedTypes.map((type, index) => (
                  <span key={index}>
                    {index > 0 && ", "}
                    <TypeView type={type} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={onSelectSymbol} />
                  </span>
                ))}
              </>
            )
          : null}
      </>
    );
  }

  const name = reflection.kind === 512 ? "constructor" : reflection.name;
  const isCallable = Boolean(reflection.signatures?.length || reflection.kind === 64 || reflection.kind === 2048 || reflection.kind === 512);

  if (isCallable) {
    return (
      <>
        <span className="api-token api-token--name">{name}</span>
        <span className="api-token api-token--operator">(</span>
        {signature.parameters?.map((parameter, index) => (
          <span key={parameter.id}>
            {index > 0 && <span className="api-token api-token--operator">, </span>}
            <span className="api-token api-token--param">
              {parameter.name}
              {parameter.flags?.isOptional ? "?" : ""}
            </span>
            <span className="api-token api-token--operator">: </span>
            <TypeView type={parameter.type} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={onSelectSymbol} />
          </span>
        ))}
        <span className="api-token api-token--operator">)</span>
        {reflection.kind !== 512 && (
          <>
            <span className="api-token api-token--operator">: </span>
            <TypeView type={signature.type} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={onSelectSymbol} />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <span className="api-token api-token--name">
        {reflection.name}
        {reflection.flags?.isOptional ? "?" : ""}
      </span>
      <span className="api-token api-token--operator">: </span>
      <TypeView type={reflection.type} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={onSelectSymbol} />
    </>
  );
}

export default function ApiPage(): ReactNode {
  const manifestUrl = useBaseUrl("/api/manifest.json");
  const apiBaseUrl = useBaseUrl("/api");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchShortcut, setSearchShortcut] = useState("Ctrl K");
  const [manifest, setManifest] = useState<ApiManifest | null>(null);
  const [selectedPackage, setSelectedPackage] = useState("arcscord");
  const [selectedVersion, setSelectedVersion] = useState("");
  const [selectedSymbolId, setSelectedSymbolId] = useState<number | null>(null);
  const [pendingSymbolName, setPendingSymbolName] = useState("");
  const [query, setQuery] = useState("");
  const [api, setApi] = useState<TypeDocReflection | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(manifestUrl)
      .then((response) => {
        if (!response.ok)
          throw new Error(`Unable to load API manifest (${response.status})`);
        return response.json();
      })
      .then((data: ApiManifest) => {
        const initialSelection = resolveUrlSelection(data);
        setManifest(data);
        setSelectedPackage(initialSelection.packageSlug);
        setSelectedVersion(initialSelection.version);
        setPendingSymbolName(initialSelection.symbolName);
        writeApiUrl(data, initialSelection.packageSlug, initialSelection.version, initialSelection.symbolName, "replace");
        setError("");
      })
      .catch(err => setError(err instanceof Error ? err.message : "Unable to load API manifest"));
  }, [manifestUrl]);

  useEffect(() => {
    if (!manifest || !selectedPackage || !selectedVersion)
      return;

    const file = manifest.packages[selectedPackage]?.files[selectedVersion];
    if (!file) {
      setApi(null);
      setError("No API snapshot exists for this package/version.");
      return;
    }

    setApi(null);
    fetch(file.startsWith("/api/") ? `${apiBaseUrl}${file.slice("/api".length)}` : file)
      .then((response) => {
        if (!response.ok)
          throw new Error(`Unable to load API snapshot (${response.status})`);
        return response.json();
      })
      .then((data: TypeDocReflection) => {
        setApi(data);
        setError("");
      })
      .catch(err => setError(err instanceof Error ? err.message : "Unable to load API snapshot"));
  }, [apiBaseUrl, manifest, selectedPackage, selectedVersion]);

  const symbols = useMemo(() => topLevelSymbols(api), [api]);
  const filteredSymbols = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery)
      return symbols;
    return symbols.filter(symbol => symbol.name.toLowerCase().includes(normalizedQuery));
  }, [query, symbols]);
  const selectedSymbol = symbols.find(symbol => symbol.id === selectedSymbolId)
    ?? symbols.find(symbol => symbol.id === selectInitialSymbol(symbols, selectedSymbolId));
  const currentPackage = selectedPackage ? manifest?.packages[selectedPackage] : undefined;
  const ownerMap = useMemo(() => buildTopLevelOwnerMap(api), [api]);
  const nameMap = useMemo(() => buildTopLevelNameMap(symbols), [symbols]);
  const reflectionMap = useMemo(() => buildReflectionMap(api), [api]);
  const symbolById = useMemo(() => new Map(symbols.map(symbol => [symbol.id, symbol])), [symbols]);
  const selectedMembers = useMemo(
    () => displayMembers(selectedSymbol, reflectionMap),
    [reflectionMap, selectedSymbol],
  );

  function selectSymbol(id: number): void {
    setSelectedSymbolId(id);
    const symbol = symbolById.get(id);
    if (symbol && typeof window !== "undefined") {
      setPendingSymbolName(symbol.name);
      if (manifest)
        writeApiUrl(manifest, selectedPackage, selectedVersion, symbol.name, "push");
      scrollApiContentToTop();
    }
  }

  useEffect(() => {
    const symbolName = pendingSymbolName || urlSymbolName();
    const hashSymbol = symbolName
      ? symbols.find(symbol => symbol.name === symbolName || String(symbol.id) === symbolName)
      : undefined;

    setSelectedSymbolId(currentId => selectInitialSymbol(symbols, hashSymbol?.id ?? currentId));
  }, [pendingSymbolName, symbols]);

  useEffect(() => {
    if (!manifest)
      return undefined;

    function onPopState(): void {
      const nextSelection = resolveUrlSelection(manifest);
      setSelectedPackage(nextSelection.packageSlug);
      setSelectedVersion(nextSelection.version);
      setSelectedSymbolId(null);
      setPendingSymbolName(nextSelection.symbolName);
      setQuery("");
      scrollApiContentToTop();
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [manifest]);

  useEffect(() => {
    setSearchShortcut(/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K");

    function onKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Layout title="API Reference" description="Arcscord generated API reference">
      <main className="api-shell">
        <aside className="api-sidebar">
          <div className="api-sidebar__controls">
            <label htmlFor="api-package">Package</label>
            <select
              id="api-package"
              value={selectedPackage}
              onChange={(event) => {
                const pkg = event.target.value;
                const version = manifest?.packages[pkg]?.defaultVersion ?? "";
                setSelectedPackage(pkg);
                setSelectedVersion(version);
                setSelectedSymbolId(null);
                setPendingSymbolName("");
                setQuery("");
                if (manifest)
                  writeApiUrl(manifest, pkg, version, undefined, "push");
                scrollApiContentToTop();
              }}
            >
              {(Object.entries(manifest?.packages ?? {}) as Array<[string, ApiManifestPackage]>).map(([slug, pkg]) => (
                <option key={slug} value={slug}>{pkg.name}</option>
              ))}
            </select>

            <label htmlFor="api-version">Version</label>
            <select
              id="api-version"
              value={selectedVersion}
              onChange={(event) => {
                const version = event.target.value;
                setSelectedVersion(version);
                setSelectedSymbolId(null);
                setPendingSymbolName("");
                setQuery("");
                if (manifest)
                  writeApiUrl(manifest, selectedPackage, version, undefined, "push");
                scrollApiContentToTop();
              }}
            >
              {currentPackage?.versions.map(version => (
                <option key={version} value={version}>{version}</option>
              ))}
            </select>

            <label htmlFor="api-search">Search</label>
            <div className="api-search">
              <input
                id="api-search"
                ref={searchInputRef}
                type="search"
                value={query}
                placeholder="Find a symbol"
                onChange={event => setQuery(event.target.value)}
              />
              <kbd>{searchShortcut}</kbd>
            </div>
          </div>

          <nav className="api-nav" aria-label="API symbols">
            {groupedSymbols(filteredSymbols).map(([group, groupSymbols]) => (
              <section key={group}>
                <h2>{group}</h2>
                {groupSymbols.map(symbol => (
                  <button
                    key={symbol.id}
                    className={symbol.id === selectedSymbol?.id ? "api-nav__item api-nav__item--active" : "api-nav__item"}
                    type="button"
                    onClick={() => selectSymbol(symbol.id)}
                  >
                    {symbol.name}
                  </button>
                ))}
              </section>
            ))}
          </nav>
        </aside>

        <article className="api-content">
          <header className="api-header">
            <div>
              <p className="api-eyebrow">
                {currentPackage?.name ?? "API"}
                {" "}
                /
                {" "}
                {selectedVersion}
              </p>
              <h1>{selectedSymbol?.name ?? "API Reference"}</h1>
            </div>
            {selectedSymbol && <span className="api-badge">{kindName(selectedSymbol)}</span>}
          </header>

          {error && <p className="api-error">{error}</p>}

          {selectedSymbol && (
            <>
              {shouldShowSignature(selectedSymbol) && (
                <pre className="api-signature"><code><SignatureView reflection={selectedSymbol} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={selectSymbol} /></code></pre>
              )}
              {displayComment(selectedSymbol) && (
                <p className="api-description">
                  <CommentView reflection={selectedSymbol} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={selectSymbol} />
                </p>
              )}

              {relatedTypes(selectedSymbol).length > 0 && (
                <dl className="api-relations">
                  {relatedTypes(selectedSymbol).map(([label, types]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>
                        {types.map((type, index) => (
                          <span key={index}>
                            {index > 0 && <span className="api-type api-type--operator">, </span>}
                            <TypeView type={type} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={selectSymbol} />
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {[...blockTagText(selectedSymbol, "@example"), ...blockTagText(primarySignature(selectedSymbol), "@example")].map((example, index) => (
                <ExampleBlock key={index} example={example} />
              ))}

              {selectedSymbol.sources?.[0] && (
                <p className="api-source">
                  Source:
                  {" "}
                  {selectedSymbol.sources[0].url
                    ? (
                        <a href={selectedSymbol.sources[0].url}>
                          {selectedSymbol.sources[0].fileName}
                          :
                          {selectedSymbol.sources[0].line}
                        </a>
                      )
                    : `${selectedSymbol.sources[0].fileName}:${selectedSymbol.sources[0].line}`}
                </p>
              )}

              {selectedMembers.length > 0 && (
                <section className="api-members">
                  <h2>{membersTitle(selectedSymbol)}</h2>
                  {selectedMembers.map((member) => {
                    const signature = member.signatures?.[0] ?? member;
                    return (
                      <article key={member.id} className="api-member">
                        <div className="api-member__meta">{kindName(member)}</div>
                        <h3><code><SignatureView reflection={member} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={selectSymbol} /></code></h3>
                        {displayComment(member) && (
                          <p>
                            <CommentView reflection={member} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={selectSymbol} />
                          </p>
                        )}
                        {signature.parameters?.length
                          ? (
                              <div className="api-params">
                                <h4>Parameters</h4>
                                {signature.parameters.map(parameter => (
                                  <div key={parameter.id} className="api-param">
                                    <code>
                                      <span className="api-token api-token--param">
                                        {parameter.name}
                                        {parameter.flags?.isOptional ? "?" : ""}
                                      </span>
                                      <span className="api-token api-token--operator">: </span>
                                      <TypeView type={parameter.type} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={selectSymbol} />
                                    </code>
                                    {displayComment(parameter) && (
                                      <span>
                                        <CommentView reflection={parameter} ownerMap={ownerMap} nameMap={nameMap} onSelectSymbol={selectSymbol} />
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )
                          : null}
                      </article>
                    );
                  })}
                </section>
              )}
            </>
          )}
        </article>
      </main>
    </Layout>
  );
}
