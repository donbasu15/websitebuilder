import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { StepsList } from "../components/StepsList";
import { FileExplorer } from "../components/FileExplorer";
import { TabView } from "../components/TabView";
import { CodeEditor } from "../components/CodeEditor";
import { PreviewFrame } from "../components/PreviewFrame";
import { Step, FileItem, StepType } from "../types";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { parseXml } from "../steps";
import { useWebContainer } from "../hooks/useWebContainer";
import { FileNode } from "@webcontainer/api";
import { Loader } from "../components/Loader";

const MOCK_FILE_CONTENT = `// This is a sample file content
import React from 'react';

function Component() {
  return <div>Hello World</div>;
}

export default Component;`;

export function Builder() {
  const location = useLocation();
  const { prompt } = location.state as { prompt: string };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const webcontainer = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const [steps, setSteps] = useState<Step[]>([]);

  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    steps
      .filter(({ status }) => status === "pending")
      .map((step) => {
        updateHappened = true;
        if (step?.type === StepType.CreateFile) {
          let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
          let currentFileStructure = [...originalFiles]; // {}
          let finalAnswerRef = currentFileStructure;

          let currentFolder = "";
          while (parsedPath.length) {
            currentFolder = `${currentFolder}/${parsedPath[0]}`;
            let currentFolderName = parsedPath[0];
            parsedPath = parsedPath.slice(1);

            if (!parsedPath.length) {
              // final file
              let file = currentFileStructure.find(
                (x) => x.path === currentFolder
              );
              if (!file) {
                currentFileStructure.push({
                  name: currentFolderName,
                  type: "file",
                  path: currentFolder,
                  content: step.code,
                });
              } else {
                file.content = step.code;
              }
            } else {
              /// in a folder
              let folder = currentFileStructure.find(
                (x) => x.path === currentFolder
              );
              if (!folder) {
                // create the folder
                currentFileStructure.push({
                  name: currentFolderName,
                  type: "folder",
                  path: currentFolder,
                  children: [],
                });
              }

              currentFileStructure = currentFileStructure.find(
                (x) => x.path === currentFolder
              )!.children!;
            }
          }
          originalFiles = finalAnswerRef;
        }
      });

    if (updateHappened) {
      setFiles(originalFiles);
      setSteps((steps) =>
        steps.map((s: Step) => {
          return {
            ...s,
            status: "completed",
          };
        })
      );
    }
    console.log(files);
  }, [steps, files]);

  useEffect(() => {
    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};

      const processFile = (file: FileItem, isRootFolder: boolean) => {
        if (file.type === "folder") {
          // For folders, create a directory entry
          mountStructure[file.name] = {
            directory: file.children
              ? Object.fromEntries(
                  file.children.map((child) => [
                    child.name,
                    processFile(child, false),
                  ])
                )
              : {},
          };
        } else if (file.type === "file") {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || "",
              },
            };
          } else {
            // For files, create a file entry with contents
            return {
              file: {
                contents: file.content || "",
              },
            };
          }
        }

        return mountStructure[file.name];
      };

      // Process each top-level file/folder
      files.forEach((file) => processFile(file, true));

      return mountStructure;
    };

    const mountStructure = createMountStructure(files);

    // Mount the structure if WebContainer is available
    console.log(mountStructure);
    webcontainer?.mount(mountStructure);
  }, [files, webcontainer]);

  async function init() {
    const response = await axios.post(`${BACKEND_URL}/template`, {
      prompt: prompt.trim(),
    });
    setTemplateSet(true);

    const { prompts, uiPrompts } = response.data;

    setSteps(
      parseXml(uiPrompts[0]).map((x: Step) => ({
        ...x,
        status: "pending",
      }))
    );

    setLoading(true);
    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...prompts, prompt].join("\n"),
    });

    setLoading(false);

    setSteps((s) => [
      ...s,
      ...parseXml(stepsResponse.data.response).map((x) => ({
        ...x,
        status: "pending" as "pending",
      })),
    ]);

    setLlmMessages(
      [...prompts, prompt].map((content) => ({
        role: "user",
        content,
      }))
    );

    setLlmMessages((x) => [
      ...x,
      { role: "assistant", content: stepsResponse.data.response },
    ]);
  }

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 flex flex-col">
      <header className="bg-gradient-to-r from-blue-900 via-purple-900 to-pink-900 border-b border-gray-800 px-8 py-6 shadow-lg">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-1">
          Website Builder
        </h1>
        <p className="text-md text-gray-200 font-light">
          Prompt: <span className="text-pink-300">{prompt}</span>
        </p>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-8 p-8">
          <div className="col-span-1 space-y-8 overflow-auto">
            <div className="bg-gray-950/80 rounded-2xl shadow-xl p-4 border border-gray-800 backdrop-blur-md">
              <div className="max-h-[70vh] overflow-scroll">
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              </div>
              <div className="mt-6">
                <div className="flex flex-col gap-2">
                  {(loading || !templateSet) && <Loader />}
                  {!(loading || !templateSet) && (
                    <>
                      <textarea
                        value={userPrompt}
                        onChange={(e) => {
                          setPrompt(e.target.value);
                        }}
                        className="p-3 w-full bg-gray-900 text-gray-100 border border-gray-700 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none placeholder-gray-500 text-md transition-all mb-2"
                        placeholder="Ask a question or give instructions..."
                      ></textarea>
                      <button
                        onClick={async () => {
                          const newMessage = {
                            role: "user" as "user",
                            content: userPrompt,
                          };

                          setLoading(true);
                          const stepsResponse = await axios.post(
                            `${BACKEND_URL}/chat`,
                            {
                              messages: [
                                ...llmMessages.map((m) => m.content),
                                newMessage.content,
                              ].join("\n"),
                            }
                          );
                          setLoading(false);

                          setLlmMessages((x) => [...x, newMessage]);
                          setLlmMessages((x) => [
                            ...x,
                            {
                              role: "assistant",
                              content: stepsResponse.data.response,
                            },
                          ]);

                          setSteps((s) => [
                            ...s,
                            ...parseXml(stepsResponse.data.response).map(
                              (x) => ({
                                ...x,
                                status: "pending" as "pending",
                              })
                            ),
                          ]);
                        }}
                        className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 py-2 rounded-xl font-semibold shadow-lg hover:scale-105 hover:shadow-pink-500/30 transition-all"
                      >
                        Send
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-1">
            <div className="bg-gray-950/80 rounded-2xl shadow-xl p-4 border border-gray-800 backdrop-blur-md h-full">
              <FileExplorer files={files} onFileSelect={setSelectedFile} />
            </div>
          </div>
          <div className="col-span-2">
            <div className="bg-gray-950/80 rounded-2xl shadow-2xl p-6 border border-gray-800 backdrop-blur-md h-[calc(100vh-10rem)] flex flex-col">
              <TabView activeTab={activeTab} onTabChange={setActiveTab} />
              <div className="flex-1 mt-4 overflow-auto">
                {activeTab === "code" ? (
                  <CodeEditor file={selectedFile} />
                ) : (
                  <PreviewFrame webContainer={webcontainer} files={files} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
