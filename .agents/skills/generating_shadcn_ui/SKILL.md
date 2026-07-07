---
name: generating-shadcn-ui
description: Use this skill when the user asks to build, modify, or style React, Tailwind CSS, or shadcn/ui components. This skill assists with generating responsive, modern UI elements. Do NOT use this skill for pure HTML layouts without React, backend API implementation, or writing test cases.
version: 1.0.0
license: MIT
---

# Generating Shadcn UI Components

## When to Use
Use this skill when you need to create, update, or style visual components in the React frontend using Tailwind CSS and shadcn/ui. This establishes a modern, responsive, and visually appealing component library.

## Core Workflow
1. **Analyze Requirements:** Review the user request to identify the required form controls, layout needs, and color schemes.
2. **Consult Component Catalog:** Refer to the shadcn/ui design patterns for standard components (like Dialog, Form, Card, Button).
3. **Draft the Layout:** Group elements semantically using standard HTML5 tags and layout helpers like Flexbox or Grid.
4. **Apply Styles:** Style elements with Tailwind utility classes, preferring CSS variables for colors (e.g. `bg-background`, `text-primary`) to support light/dark modes easily.
5. **Add Interactions:** Implement state hooks (`useState`, `useEffect`) and event handlers for interactive state changes.

## Guidelines & Rationale
* **Avoid Hardcoded Colors:** Rely on shadcn theme variables (e.g. `text-muted-foreground`) to maintain dark mode compatibility across all components automatically.
* **Keep Code Modular:** Extract complex sub-components (like modal item lists) into their own functions or separate files so that test suites remain clean and isolated.
* **Responsive Design First:** Use Tailwind responsive modifiers (`sm:`, `md:`, `lg:`) to prevent layouts from breaking on narrow screens.

## Few-Shot Example
*Input:* "Create a simple card with a button."
*Output:*
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SimpleCard() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Welcome Card</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Click the button below to get started.</p>
        <Button className="w-full">Get Started</Button>
      </CardContent>
    </Card>
  );
}
```

## Constraints & Anti-Patterns
* Do NOT import raw CSS styles inline; this conflicts with the Tailwind utility classes.
* Do NOT bundle multiple distinct panels into a single massive file. Keep layouts clean by splitting code logic.
