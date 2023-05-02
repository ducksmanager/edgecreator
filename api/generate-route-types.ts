import parser from "@babel/parser";
import {
  Identifier,
  TypeAnnotation,
  TypeParameterDeclaration,
  VariableDeclaration,
} from "@babel/types";
import { ArrowFunctionExpression } from "@babel/types";
import { RestElement } from "@babel/types";
import { ArrayExpression } from "@babel/types";
import { InterfaceDeclaration } from "@babel/types";
import { ExportNamedDeclaration, VariableDeclarator } from "@babel/types";
import express from "express";
import { router } from "express-file-routing";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";

const app = express();
app.use("/", router({ directory: `${process.cwd()}/routes` }));

interface Route {
  path: string | RegExp;
  methods: Record<string, boolean>;
}
const routes: Route[] = [];
app._router.stack.forEach(
  (middleware: {
    route: Route;
    name: string;
    handle: { stack: [{ route: Route }] };
  }) => {
    if (typeof middleware.route?.path === "string") {
      // routes registered directly on the app
      routes.push(middleware.route);
    } else if (middleware.name === "router") {
      // router middleware
      middleware.handle.stack.forEach((handler) => {
        if (typeof handler.route?.path === "string") {
          routes.push(handler.route);
        }
      });
    }
  }
);

const imports: string[] = [
  "// noinspection ES6PreferShortImport",
  "",
  'import { ContractWithMethodAndUrl } from "./Call";',
];
imports.push(
  readdirSync("../types")
    .filter((file) => file.endsWith(".ts") && /^[A-Z]/.test(file[0]))
    .map(
      (file) =>
        `import { ${(
          parser
            .parse(readFileSync(`../types/${file}`).toString(), {
              sourceType: "unambiguous",
              plugins: ["typescript"],
            })
            .program.body.filter(
              ({ declaration, type }) =>
                type === "ExportNamedDeclaration" &&
                declaration?.type !== "ExportDefaultDeclaration"
            ) as ExportNamedDeclaration[]
        )
          // eslint-disable-next-line
          .map((node) => (node.declaration as InterfaceDeclaration)?.id.name)
          .join(", ")} } from "./${file.replace(/\.ts$/, "")}";`
    )
    .join("\n")
);
const types: string[] = [];

let routeClassList = {} as Record<string, string>;
routes.forEach((route) => {
  const routePath = route.path as string;
  const routeBasePath = `routes/${routePath.replace(/^\//, "")}`;
  const routeFile = (
    existsSync(`${routeBasePath}/index.ts`)
      ? readFileSync(`${routeBasePath}/index.ts`)
      : readFileSync(`${routeBasePath}.ts`)
  ).toString();
  const endpoints: Record<string, string> = (
    parser
      .parse(routeFile, {
        sourceType: "unambiguous",
        plugins: ["typescript"],
      })
      .program.body.filter(
        ({ type }) => type === "ExportNamedDeclaration"
      ) as ExportNamedDeclaration[]
  )
    .map(
      (declaration) =>
        (declaration as VariableDeclaration).declaration.declarations[0]
    )
    .filter(
      ({ init }) =>
        init?.type === "ArrowFunctionExpression" ||
        (init?.type === "ArrayExpression" &&
          init?.elements.some(({ type }) => type === "ArrowFunctionExpression"))
    )
    .map((declaration: VariableDeclarator) => {
      return {
        method: (declaration.id as Identifier).name,
        contract: (
          (
            (
              ((declaration.init as ArrowFunctionExpression)
                .params?.[0] as RestElement) ||
              ((declaration.init as ArrayExpression).elements.find(
                ({ type }) => type === "ArrowFunctionExpression"
              )!.params[0] as RestElement)
            ).typeAnnotation as TypeAnnotation
          ).typeAnnotation.typeParameters as TypeParameterDeclaration
        ).params[0].loc as unknown as {
          start: { index: number };
          end: { index: number };
        },
      };
    })
    .reduce(
      (acc, { method, contract }) => ({
        ...acc,
        [method]: routeFile.substring(contract.start.index, contract.end.index),
      }),
      {}
    );
  routeClassList = Object.keys(route.methods)
    .filter((method) => ["get", "post", "delete", "put"].includes(method))
    .reduce(
      (acc, method) => ({
        ...acc,
        [`${method.toUpperCase()} ${routePath}`]: ` extends ContractWithMethodAndUrl<${
          endpoints[method === "delete" ? "del" : method]
        }> {
            static readonly method = "${method}";
            static readonly url = "${routePath}";
        }`,
      }),
      routeClassList
    );
});
writeFileSync(
  "../types/routes.ts",
  [
    imports.join("\n"),
    types.join("\n"),
    Object.entries(routeClassList)
      .map(
        ([routePathWithMethod, callback]) =>
          `export class ${routePathWithMethod
            .replaceAll("/", "__")
            .replaceAll(/ /g, "")
            .replaceAll(/:/g, "$")
            .replaceAll(/-/g, "_")} ${callback}`
      )
      .join("\n"),
  ].join("\n")
);
