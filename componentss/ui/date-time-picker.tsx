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
  
  // Initialize time with current UTC time
  const getCurrentUTCTime = () => {
    const now = new Date()
    const hours = now.getUTCHours().toString().padStart(2, '0')
    const minutes = now.getUTCMinutes().toString().padStart(2, '0')
    const seconds = now.getUTCSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }
  
  const [time, setTime] = React.useState(getCurrentUTCTime())

  // Update time from date when date changes (using UTC to avoid timezone conversion)
  React.useEffect(() => {
    if (date) {
      const hours = date.getUTCHours().toString().padStart(2, '0')
      const minutes = date.getUTCMinutes().toString().padStart(2, '0')
      const seconds = date.getUTCSeconds().toString().padStart(2, '0')
      setTime(`${hours}:${minutes}:${seconds}`)
    }
  }, [date])

  const handleTimeChange = (newTime: string) => {
    setTime(newTime)
    
    if (date) {
      const [hours, minutes, seconds] = newTime.split(':').map(Number)
      const newDate = new Date(date)
      // Use setUTCHours to set time in UTC, not local timezone
      newDate.setUTCHours(hours || 0, minutes || 0, seconds || 0)
      onDateChange(newDate)
    }
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const [hours, minutes, seconds] = time.split(':').map(Number)
      // Use setUTCHours to set time in UTC, not local timezone
      selectedDate.setUTCHours(hours || 0, minutes || 0, seconds || 0)
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
