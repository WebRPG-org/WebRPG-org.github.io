import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

import {
  Card as ShadcnCard,
  CardAction as ShadcnCardAction,
  CardContent as ShadcnCardContent,
  CardDescription as ShadcnCardDescription,
  CardFooter as ShadcnCardFooter,
  CardHeader as ShadcnCardHeader,
  CardTitle as ShadcnCardTitle,
} from "@/components/ui/card";

import "@/components/ui/pixelact-ui/styles/styles.css";

export const cardVariants = cva("", {
  variants: {
    font: {
      normal: "",
      pixel: "pixel-font",
    },
  },
  defaultVariants: {
    font: "pixel",
  },
});

export interface CardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

function Card({ className, font, asChild: _asChild, ...props }: CardProps) {

  return (
    <ShadcnCard
      {...props}
      className={cn(
        "rounded-none border-0 bg-card shadow-(--pixel-box-shadow) box-shadow-margin",
        cardVariants({ font }),
        className
      )}
    />
  );
}

function CardHeader({ className, font: _font, asChild: _asChild, ...props }: CardProps) {

  return <ShadcnCardHeader className={cn("", className)} {...props} />;
}

function CardTitle({ className, font: _font, asChild: _asChild, ...props }: CardProps) {

  return (
    <ShadcnCardTitle
      className={cn("font-normal text-lg", className)}
      {...props}
    />
  );
}

function CardDescription({ className, font: _font, asChild: _asChild, ...props }: CardProps) {

  return <ShadcnCardDescription className={cn(className)} {...props} />;
}

function CardAction({ className, font: _font, asChild: _asChild, ...props }: CardProps) {

  return <ShadcnCardAction className={cn(className)} {...props} />;
}

function CardContent({ className, font: _font, asChild: _asChild, ...props }: CardProps) {

  return <ShadcnCardContent className={cn(className)} {...props} />;
}

function CardFooter({ className, font: _font, asChild: _asChild, ...props }: CardProps) {

  return (
    <ShadcnCardFooter
      data-slot="card-footer"
      className={cn(className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
