"use client"

import { useState, useCallback } from "react"
import {
  FieldLabel,
  TextInput,
  SelectInput,
  updateCourseById,
  useCourseRowLoader,
  useDebouncedChangeSave,
  SetupSection,
  SetupPanels,
} from "@/components/coursebuilder"
import { OverlineLabel } from "@/components/ui/overline-label"

export function PricingSection({ courseId }: { courseId: string | null }) {
  const [pricingModel, setPricingModel] = useState("free")
  const [basePrice, setBasePrice] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [trial, setTrial] = useState(false)
  const [discountNotes, setDiscountNotes] = useState("")

  useCourseRowLoader<{ pricing_settings: Record<string, unknown> | null }>({
    courseId,
    select: "pricing_settings",
    onLoaded: (row) => {
      const p = row.pricing_settings
      if (!p) return
      setPricingModel((p.pricing_model as string) ?? "free")
      setBasePrice(p.base_price != null ? String(p.base_price) : "")
      setCurrency((p.currency as string) ?? "USD")
      setTrial((p.trial as boolean) ?? false)
      setDiscountNotes((p.discount_notes as string) ?? "")
    },
  })

  const handleSave = useCallback(async () => {
    if (!courseId) return
    await updateCourseById(courseId, {
      pricing_settings: {
        pricing_model:  pricingModel,
        base_price:     basePrice !== "" ? Number(basePrice) : null,
        currency,
        trial,
        discount_notes: discountNotes || null,
      },
      updated_at: new Date().toISOString(),
    })
  }, [courseId, pricingModel, basePrice, currency, trial, discountNotes])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  return (
    <SetupSection title="Pricing & Monetization" description="Set the pricing model and revenue settings for your course.">
      <SetupPanels
        config={(
          <div className="space-y-4">
            <div>
              <FieldLabel>Pricing Model</FieldLabel>
              <SelectInput value={pricingModel} onChange={(e) => setPricingModel(e.target.value)}>
                <option value="free">Free</option>
                <option value="subscription">Subscription</option>
                <option value="one-time">One-time purchase</option>
                <option value="license">Site license</option>
              </SelectInput>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Base Price</FieldLabel>
                <TextInput
                  type="number"
                  min={0}
                  step={1}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="99"
                />
              </div>
              <div>
                <FieldLabel>Currency</FieldLabel>
                <SelectInput value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </SelectInput>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={trial}
                onChange={() => setTrial(!trial)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              <span className="text-sm text-foreground">Offer free trial</span>
            </label>
            <div>
              <FieldLabel hint="optional">Discount Notes</FieldLabel>
              <textarea
                rows={3}
                value={discountNotes}
                onChange={(e) => setDiscountNotes(e.target.value)}
                placeholder="Describe educator or early-bird discounts"
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </div>
        )}
        preview={(
          <div className="rounded-lg border border-border bg-background p-4 space-y-2.5">
            <OverlineLabel>Pricing Preview</OverlineLabel>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Model</span><span className="font-medium text-foreground">{pricingModel}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Price</span><span className="font-medium text-foreground">{basePrice || "0"} {currency}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Trial</span><span className="font-medium text-foreground">{trial ? "Enabled" : "Disabled"}</span></div>
            <div className="pt-1 text-xs text-muted-foreground">{discountNotes || "No discount notes."}</div>
          </div>
        )}
      />
    </SetupSection>
  )
}
