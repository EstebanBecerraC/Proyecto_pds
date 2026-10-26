const webhook = process.env.DISCORD_WEBHOOK;
if (!webhook) {
  console.error("No esta configurada la credencial discord-webhook.");
  process.exit(1);
}

const result = process.env.CI_RESULT || "UNKNOWN";
const icon = result === "SUCCESS" ? "✅" : result === "ABORTED" ? "⏹️" : "❌";
const content = [
  `${icon} CrowdStarter: ${result}`,
  `Trabajo: ${process.env.JOB_NAME || "Jenkins"} #${process.env.BUILD_NUMBER || "?"}`,
  `Commit: ${process.env.GIT_COMMIT || "no disponible"}`,
  process.env.BUILD_URL || "",
].join("\n");

try {
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  console.log("Notificacion enviada a Discord.");
} catch (error) {
  // No imprimir la URL ni excepciones que pudieran incluir el secreto.
  console.error(`Fallo el envio a Discord: ${error.message.startsWith("HTTP ") ? error.message : "error de conexion o timeout"}`);
  process.exit(1);
}
