import { useEffect, useState } from "react";
import { loadConfig } from "../config";

const GATEWAY_VERSION = "v1";
const SENTINEL = "!caf!";

export function useStorageClient() {
  const [config, setConfig] = useState<{
    storageGatewayUrl: string;
    canisterId: string;
    projectId: string;
  } | null>(null);

  useEffect(() => {
    loadConfig()
      .then((c) => {
        setConfig({
          storageGatewayUrl: c.storage_gateway_url ?? "",
          canisterId: c.backend_canister_id ?? "",
          projectId: c.project_id ?? "",
        });
      })
      .catch(console.warn);
  }, []);

  const getUrl = (hashOrId: string | undefined): string => {
    if (!hashOrId || !config?.storageGatewayUrl) return "";
    // Strip sentinel prefix if present
    const hash = hashOrId.startsWith(SENTINEL)
      ? hashOrId.substring(SENTINEL.length)
      : hashOrId;
    if (!hash.startsWith("sha256:")) return "";
    return `${config.storageGatewayUrl}/${GATEWAY_VERSION}/blob/?blob_hash=${encodeURIComponent(hash)}&owner_id=${encodeURIComponent(config.canisterId)}&project_id=${encodeURIComponent(config.projectId)}`;
  };

  return { getUrl };
}
