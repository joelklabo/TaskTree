import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { CodeEditor } from "@/components/CodeEditor";
import {
  listPrompts,
  getPrompt,
  updatePrompt,
  listFlowFiles,
  getFlowFile,
  updateFlowFile,
  listAgents,
  getAgent,
  updateAgent,
} from "@/api/client";

type FileType = "prompt" | "flow" | "agent";

export function EditorPage() {
  const [activeTab, setActiveTab] = useState<FileType>("prompt");
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadFiles = useCallback(
    async (type: FileType, signal?: AbortSignal) => {
      setLoading(true);
      try {
        let list: string[] = [];
        if (type === "prompt") list = await listPrompts();
        else if (type === "flow") list = await listFlowFiles();
        else if (type === "agent") list = await listAgents();
        if (!signal?.aborted) {
          setFiles(list);
        }
      } catch (err) {
        if (!signal?.aborted) {
          toast({ title: "Error loading files", description: String(err), variant: "destructive" });
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [toast],
  );

  useEffect(() => {
    const abort = new AbortController();
    setSelectedFile(null);
    setContent("");
    void loadFiles(activeTab, abort.signal);
    return () => abort.abort();
  }, [activeTab, loadFiles]);

  const loadContent = async (filename: string) => {
    setLoading(true);
    try {
      let data;
      if (activeTab === "prompt") data = await getPrompt(filename);
      else if (activeTab === "flow") data = await getFlowFile(filename);
      else if (activeTab === "agent") data = await getAgent(filename);

      if (data) {
        setContent(data.content);
        setSelectedFile(filename);
      }
    } catch (err) {
      toast({ title: "Error loading content", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      if (activeTab === "prompt") await updatePrompt(selectedFile, content);
      else if (activeTab === "flow") await updateFlowFile(selectedFile, content);
      else if (activeTab === "agent") await updateAgent(selectedFile, content);

      toast({ title: "Saved successfully", description: `${selectedFile} updated.` });
    } catch (err) {
      toast({ title: "Error saving", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-4rem)]">
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Configuration Editor</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as FileType)}
            className="h-full flex flex-col"
          >
            <TabsList data-testid="editor-tabs">
              <TabsTrigger value="prompt">Prompts</TabsTrigger>
              <TabsTrigger value="flow">Flows</TabsTrigger>
              <TabsTrigger value="agent">Agents</TabsTrigger>
            </TabsList>

            <div className="flex-1 flex mt-4 gap-4 overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 border-r pr-4 flex flex-col">
                <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase">
                  Files
                </h3>
                <ScrollArea className="flex-1">
                  <div className="space-y-1">
                    {files.map((file) => (
                      <Button
                        key={file}
                        variant={selectedFile === file ? "secondary" : "ghost"}
                        className="w-full justify-start text-sm"
                        onClick={() => loadContent(file)}
                      >
                        {file}
                      </Button>
                    ))}
                    {files.length === 0 && !loading && (
                      <div className="text-sm text-muted-foreground italic">No files found</div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Editor Area */}
              <div className="flex-1 flex flex-col">
                {selectedFile ? (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{selectedFile}</span>
                      <Button onClick={handleSave} disabled={loading} size="sm">
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                    <CodeEditor
                      value={content}
                      onValueChange={setContent}
                      language="yaml"
                      className="flex-1"
                      enableLint={activeTab !== "prompt"}
                      enableFormat={activeTab !== "prompt"}
                      onSave={() => void handleSave()}
                    />
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Select a file to edit
                  </div>
                )}
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
