"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const orderFormSchema = z.object({
  clientName: z.string().min(2, "Client name must be at least 2 characters."),
  visitDate: z.date({ required_error: "Visit date is required." }),
  outcome: z.enum(["successful", "failed", "follow-up"], { required_error: "Please select an outcome." }),
  productsOrdered: z.string().optional(),
  orderValue: z.coerce.number().positive("Order value must be positive.").optional(),
  reasonForFailure: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.outcome === "successful") {
    if (!data.productsOrdered || data.productsOrdered.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Products ordered are required for successful outcome.",
        path: ["productsOrdered"],
      });
    }
    if (data.orderValue === undefined || data.orderValue <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Order value is required and must be positive for successful outcome.",
        path: ["orderValue"],
      });
    }
  }
  if (data.outcome === "failed" && (!data.reasonForFailure || data.reasonForFailure.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reason for failure is required for failed outcome.",
      path: ["reasonForFailure"],
    });
  }
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function OrderFormPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      clientName: "",
      productsOrdered: "",
      reasonForFailure: "",
      notes: "",
    },
  });

  const outcome = form.watch("outcome");

  async function onSubmit(values: OrderFormValues) {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(values);
    toast({
      title: "Form Submitted!",
      description: (
        <div className="flex items-start">
          <Check className="h-5 w-5 text-green-500 mr-2 mt-1" />
          <p>Client visit for {values.clientName} recorded successfully.</p>
        </div>
      ),
      variant: "default",
    });
    form.reset();
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Record Client Visit / Order</h1>
      <Card className="max-w-2xl mx-auto shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Client Visit Details</CardTitle>
          <CardDescription>Fill in the details of the client interaction.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Cafe Central" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visitDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Visit Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="successful" />
                          </FormControl>
                          <FormLabel className="font-normal">Successful Order</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="failed" />
                          </FormControl>
                          <FormLabel className="font-normal">Failed / No Order</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="follow-up" />
                          </FormControl>
                          <FormLabel className="font-normal">Follow-up Required</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {outcome === "successful" && (
                <>
                  <FormField
                    control={form.control}
                    name="productsOrdered"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Products Ordered</FormLabel>
                        <FormControl>
                          <Textarea placeholder="List products and quantities..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="orderValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Value ($)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 250.75" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {outcome === "failed" && (
                <FormField
                  control={form.control}
                  name="reasonForFailure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Failure / No Order</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Price too high, already stocked..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any other relevant information..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <CardFooter className="p-0 pt-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Record"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
