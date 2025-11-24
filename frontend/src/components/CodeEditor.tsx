import React, { useMemo } from "react";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/themes/prism.css";
import yaml from "js-yaml";
import { Copy, Check, Wand2, Save } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { cn } from "@/lib/utils";

type CodeEditorProps = {
  value: string;
  onValueChange: (value: string) => void;
  language?: "json" | "yaml";
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  enableLint?: boolean;
  enableFormat?: boolean;
  onSave?: () => void;
  textareaId?: string;
  ariaLabel?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function CodeEditor({
  value,
  onValueChange,
  language = "json",
  placeholder,
  className,
  readOnly = false,
  enableLint = false,
  enableFormat = true,
  onSave,
  textareaId,
  ariaLabel,
  ...rest
}: CodeEditorProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const lintMessage = useMemo(() => {
    if (!enableLint) return null;
    try {
      if (language === "json") {
        if (value.trim() === "") return null;
        JSON.parse(value);
      } else {
        if (value.trim() === "") return null;
        yaml.load(value);
      }
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  }, [enableLint, language, value]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  const handleFormat = () => {
    if (readOnly) return;
    try {
      let formatted = value;
      if (language === "json") {
        const parsed = value.trim() ? JSON.parse(value) : {};
        formatted = JSON.stringify(parsed, null, 2);
      } else {
        const parsed = value.trim() ? yaml.load(value) : {};
        formatted = yaml.dump(parsed, { noRefs: true });
      }
      onValueChange(formatted);
      toast({
        title: "Formatted",
        description: language === "json" ? "JSON formatted" : "YAML formatted",
        duration: 1500,
      });
    } catch (err: unknown) {
      const description = err instanceof Error ? err.message : "Unknown error";
      toast({
        title: "Unable to format",
        description,
        variant: "destructive",
      });
    }
  };

  const highlightCode = (code: string) => {
    if (language === "json") {
      return highlight(code, languages.json, "json");
    }
    return highlight(code, languages.yaml, "yaml");
  };

  const formatLabel = language === "json" ? "Format JSON" : "Format YAML";

  return (
    <div
      {...rest}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-md border bg-slate-50 font-mono text-sm",
        className,
      )}
    >
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        {enableFormat && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-white/70 hover:bg-white"
            onClick={handleFormat}
            aria-label={formatLabel}
            disabled={readOnly}
          >
            <Wand2 className="h-4 w-4" />
          </Button>
        )}
        {onSave && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-white/70 hover:bg-white"
            onClick={onSave}
            aria-label="Save"
            disabled={readOnly}
          >
            <Save className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-white/70 hover:bg-white"
          onClick={handleCopy}
          aria-label="Copy"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <Editor
        value={value}
        onValueChange={onValueChange}
        highlight={highlightCode}
        padding={16}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="min-h-[200px] font-mono"
        style={{
          fontFamily: '"Fira code", "Fira Mono", monospace',
          fontSize: 14,
          backgroundColor: readOnly ? "#f8fafc" : "#ffffff",
        }}
        readOnly={readOnly}
        textareaId={textareaId}
      />
      {enableLint && (
        <div className="border-t bg-slate-100 px-3 py-2 text-xs">
          {lintMessage ? (
            <span className="text-red-600">
              Invalid {language.toUpperCase()}: {lintMessage}
            </span>
          ) : (
            <span className="text-green-700">Valid {language.toUpperCase()}</span>
          )}
        </div>
      )}
    </div>
  );
}
