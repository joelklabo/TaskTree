import React from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Separator } from "../components/ui/separator";

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
      </div>
    </div>
  );
}
