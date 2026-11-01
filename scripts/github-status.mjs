import { execFileSync } from "node:child_process";

try {
  const token = process.env.GITHUB_STATUS_TOKEN;
  if (!token) throw new Error("Falta la credencial github-commit-status.");

  const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40,64}$/.test(sha)) throw new Error("Commit no valido.");

  const result = process.env.CI_RESULT;
  const states = {
    PENDING: "pending",
    SUCCESS: "success",
    FAILURE: "failure",
    UNSTABLE: "failure",
    ABORTED: "error",
    NOT_BUILT: "error",
  };
  const state = states[result];
  if (!state) throw new Error("Resultado de Jenkins no reconocido.");
  const target = process.env.BUILD_URL;
  if (!target || !target.startsWith("https://")) {
    throw new Error("BUILD_URL debe usar HTTPS; revisar Jenkins URL.");
  }

  const response = await fetch(
    "https://api.github.com/repos/EstebanBecerraC/Proyecto_pds/statuses/" + sha,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        state,
        target_url: target,
        description: result === "PENDING" ? "Pipeline en ejecucion" : "Jenkins: " + result,
        context: "ci/jenkins/crowdstarter",
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (response.status !== 201) {
    throw new Error("GitHub respondio HTTP " + response.status + "; revisar permisos, repositorio y vigencia del token.");
  }
  console.log("Estado de GitHub publicado: " + state + " para " + sha);
} catch (error) {
  // No imprimir errores de fetch ni respuestas que pudieran contener secretos.
  const safe = error.message;
  console.error(
    safe.startsWith("GitHub respondio") || safe.startsWith("Falta ") ||
    safe.startsWith("Commit ") || safe.startsWith("Resultado ") || safe.startsWith("BUILD_URL ")
      ? safe
      : "No se pudo publicar el estado en GitHub; revisar conexion y checkout.",
  );
  process.exitCode = 1;
}
