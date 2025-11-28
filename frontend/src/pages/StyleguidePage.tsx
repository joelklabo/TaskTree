import React from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Separator } from "../components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";

const buttonVariants: Array<{
  label: string;
  variant: "default" | "secondary" | "outline" | "ghost" | "destructive";
}> = [
  { label: "Primary", variant: "default" },
  { label: "Secondary", variant: "secondary" },
  { label: "Outline", variant: "outline" },
  { label: "Ghost", variant: "ghost" },
  { label: "Destructive", variant: "destructive" },
];

export default function StyleguidePage() {
  return (
    <div className="space-y-6" data-testid="styleguide-page">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Styleguide</p>
        <h1 className="text-2xl font-semibold tracking-tight">Shadcn component gallery</h1>
        <p className="text-sm text-muted-foreground">
          Quick grab bag of our Shadcn/Tailwind primitives with live variants.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Variants mapped to our theme tokens.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {buttonVariants.map((item) => (
              <Button key={item.variant} variant={item.variant}>
                {item.label}
              </Button>
            ))}
            <Button disabled>Disabled</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inputs & badges</CardTitle>
            <CardDescription>Neutral surface + primary accent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search or type..." />
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Tabs & content</CardTitle>
            <CardDescription>Radix-backed tabs with subtle underlines.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="bg-muted/60">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="pt-3 text-sm text-muted-foreground">
                Use tabs for short, related content. Keep labels concise.
              </TabsContent>
              <TabsContent value="details" className="pt-3 text-sm">
                Pair tabs with cards or tables when content grows.
              </TabsContent>
              <TabsContent value="settings" className="pt-3 text-sm text-muted-foreground">
                Settings tab placeholder — wire feature flags here.
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tooltip</CardTitle>
            <CardDescription>Radix tooltip wrapped in Shadcn tokens.</CardDescription>
          </CardHeader>
          <CardContent>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Hover me</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tooltips use our `--popover` colors and shadow.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Separator & layout</CardTitle>
            <CardDescription>Spacing + muted borders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Use separators to break dense content without heavy borders.</p>
            <Separator />
            <p className="text-muted-foreground">Spacing follows the Tailwind scale (gap-2/3/4).</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Table</CardTitle>
            <CardDescription>Dense table using muted header and subtle dividers.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flow</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">log_error_handler</TableCell>
                  <TableCell>
                    <Badge variant="secondary">stable</Badge>
                  </TableCell>
                  <TableCell>42</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    320 ms p50
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">code_fix</TableCell>
                  <TableCell>
                    <Badge>active</Badge>
                  </TableCell>
                  <TableCell>18</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    440 ms p50
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">trace_demo</TableCell>
                  <TableCell>
                    <Badge variant="outline">dev</Badge>
                  </TableCell>
                  <TableCell>5</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    510 ms p50
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Cards grid</CardTitle>
            <CardDescription>Use cards for quick stats and actionable summaries.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Successful runs", value: "128", hint: "Last 24h" },
              { title: "Errors", value: "3", hint: "Alerting enabled" },
              { title: "Avg latency", value: "428 ms", hint: "p50, code_fix" },
            ].map((item) => (
              <Card key={item.title} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.hint}</CardDescription>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{item.value}</CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Form controls</CardTitle>
            <CardDescription>Labels, inputs, textarea, and switches.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="flow-name">Flow name</Label>
              <Input id="flow-name" placeholder="flow id" defaultValue="code_fix" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flow-desc">Description</Label>
              <Textarea
                id="flow-desc"
                rows={3}
                placeholder="What this flow does"
                defaultValue="Fixes bugs via Codex agent"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="trace-toggle" defaultChecked />
              <div>
                <Label htmlFor="trace-toggle">Tracing</Label>
                <p className="text-sm text-muted-foreground">
                  Capture prompt/raw/parsed for each step.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Input id="owner" placeholder="team or user" defaultValue="flows-team" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
