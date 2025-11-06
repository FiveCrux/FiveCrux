"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@/componentss/ui/button"
import { Calendar } from "@/componentss/ui/calendar"
import { Input } from "@/componentss/ui/input"
import { Label } from "@/componentss/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/componentss/ui/popover"

interface DateTimePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  label?: string
  id?: string
}

export function DateTimePicker({ date, onDateChange, label = "Date & Time", id = "date-time-picker" }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [time, setTime] = React.useState("10:30:00")

  // Update time from date when date changes
  React.useEffect(() => {
    if (date) {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const seconds = date.getSeconds().toString().padStart(2, '0')
      setTime(`${hours}:${minutes}:${seconds}`)
    }
  }, [date])

  const handleTimeChange = (newTime: string) => {
    setTime(newTime)
    
    if (date) {
      const [hours, minutes, seconds] = newTime.split(':').map(Number)
      const newDate = new Date(date)
      newDate.setHours(hours || 0, minutes || 0, seconds || 0)
      onDateChange(newDate)
    }
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const [hours, minutes, seconds] = time.split(':').map(Number)
      selectedDate.setHours(hours || 0, minutes || 0, seconds || 0)
      onDateChange(selectedDate)
      setOpen(false)
    }
  }

  return (
    <div className="flex gap-6">
      <div className="flex flex-col gap-3">
        <Label htmlFor={`${id}-date`} className="px-1">
          {label}
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id={`${id}-date`}
              className="w-40 justify-between font-semibold"
            >
              {date ? date.toLocaleDateString() : "Select date"}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              onSelect={handleDateSelect}
              className="w-72 text-2xl"
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-3">
        <Label htmlFor={`${id}-time`} className="px-1">
          Time
        </Label>
        <Input
          type="time"
          id={`${id}-time`}
          step="1"
          value={time}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTimeChange(e.target.value)}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  )
}
