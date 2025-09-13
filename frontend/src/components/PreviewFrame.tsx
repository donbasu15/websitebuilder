// Remove require, use dynamic import in main()
import React, { useEffect, useState } from "react";

interface PreviewFrameProps {
  files: any[];
  webContainer: any;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  // In a real implementation, this would compile and render the preview
  const [url, setUrl] = useState("");

  async function main() {
    if (typeof window === "undefined" || !webContainer) {
      console.error("WebContainer is not available in this environment.");
      return;
    }
    // Dynamically import @webcontainer/api if needed
    // If you need to instantiate WebContainer, do it here
    // Example: const { WebContainer } = await import("@webcontainer/api");

    const installProcess = await webContainer.spawn("npm", ["install"]);

    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log(data);
        },
      })
    );

    await webContainer.spawn("npm", ["run", "dev"]);

    // Wait for `server-ready` event
    webContainer.on("server-ready", (port: any, url: any) => {
      // ...
      console.log(url);
      console.log(port);
      setUrl(url);
    });
  }

  useEffect(() => {
    main();
  }, []);
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {!url && (
        <div className="text-center">
          <p className="mb-2">Loading...</p>
        </div>
      )}
      {url && <iframe width={"100%"} height={"100%"} src={url} />}
    </div>
  );
}
