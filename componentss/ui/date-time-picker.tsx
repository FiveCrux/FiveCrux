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
import { toast } from "sonner"

interface DateTimePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  label?: string
  id?: string
  disablePastDates?: boolean
}

export function DateTimePicker({ date, onDateChange, label = "Date & Time", id = "date-time-picker", disablePastDates = false }: DateTimePickerProps) {
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

  // Get current date for default month
  const getCurrentDate = () => {
    return new Date()
  }

  // Get minimum date (today at UTC midnight)
  const getMinDate = () => {
    if (!disablePastDates) return undefined
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    return today
  }
  
  // State to control which month is displayed (prevent navigation to past months)
  const [month, setMonth] = React.useState<Date | undefined>(
    disablePastDates ? getCurrentDate() : undefined
  )

  // Disable past dates function
  const isDateDisabled = (dateToCheck: Date) => {
    if (!disablePastDates) return false
    const now = new Date()
    now.setUTCHours(0, 0, 0, 0)
    const checkDate = new Date(dateToCheck)
    checkDate.setUTCHours(0, 0, 0, 0)
    return checkDate < now
  }

  // Handle month navigation to prevent going to past months
  const handleMonthChange = (newMonth: Date) => {
    if (disablePastDates) {
      const currentDate = getCurrentDate()
      const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const newMonthStart = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1)
      
      // Only allow navigation if the new month is not in the past
      if (newMonthStart >= currentMonth) {
        setMonth(newMonth)
      }
    } else {
      setMonth(newMonth)
    }
  }

  // Update time from date when date changes (using UTC to avoid timezone conversion)
  React.useEffect(() => {
    if (date) {
      const hours = date.getUTCHours().toString().padStart(2, '0')
      const minutes = date.getUTCMinutes().toString().padStart(2, '0')
      const seconds = date.getUTCSeconds().toString().padStart(2, '0')
      setTime(`${hours}:${minutes}:${seconds}`)
    }
  }, [date])

  // Reset month to current month when popover opens (if past dates are disabled)
  React.useEffect(() => {
    if (open && disablePastDates) {
      setMonth(getCurrentDate())
    }
  }, [open, disablePastDates])

  const handleTimeChange = (newTime: string) => {
    setTime(newTime)
    
    if (date) {
      const [hours, minutes, seconds] = newTime.split(':').map(Number)
      const newDate = new Date(date)
      // Use setUTCHours to set time in UTC, not local timezone
      newDate.setUTCHours(hours || 0, minutes || 0, seconds || 0)
      
      // Validate that the new date/time is not in the past
      if (disablePastDates) {
        const now = new Date()
        if (newDate < now) {
          // If the date/time is in the past, set it to now
          toast.error("Cannot select a past date/time. Setting to current time.")
          const currentTime = getCurrentUTCTime()
          setTime(currentTime)
          onDateChange(new Date(now))
          return
        }
      }
      
      onDateChange(newDate)
    }
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const [hours, minutes, seconds] = time.split(':').map(Number)
      // Use setUTCHours to set time in UTC, not local timezone
      selectedDate.setUTCHours(hours || 0, minutes || 0, seconds || 0)
      
      // Validate that the selected date/time is not in the past
      if (disablePastDates) {
        const now = new Date()
        if (selectedDate < now) {
          // If the date/time is in the past, set it to now
          toast.error("Cannot select a past date/time. Setting to current time.")
          const currentTime = getCurrentUTCTime()
          setTime(currentTime)
          onDateChange(new Date(now))
          setOpen(false)
          return
        }
      }
      
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
              captionLayout="dropdown-months"
              onSelect={handleDateSelect}
              className="w-72 text-2xl"
              fromDate={disablePastDates ? getMinDate() : undefined}
              month={month}
              onMonthChange={handleMonthChange}
              disabled={disablePastDates ? isDateDisabled : undefined}
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
