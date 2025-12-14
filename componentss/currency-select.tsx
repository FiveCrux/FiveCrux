"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/componentss/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/componentss/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/componentss/ui/popover";
import * as countryData from "country-data-list";

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

// Get all currencies from country-data-list
const allCurrencies: Currency[] = countryData.currencies.all.map((currency: any) => ({
  code: currency.code || "",
  name: currency.name || "",
  symbol: currency.symbol || currency.code || "",
}));

interface CurrencySelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onCurrencySelect?: (currency: Currency) => void;
  placeholder?: string;
  disabled?: boolean;
  currencies?: "all" | Currency[];
  variant?: "default" | "small";
  className?: string;
}

export function CurrencySelect({
  value,
  onValueChange,
  onCurrencySelect,
  placeholder = "Select currency...",
  disabled = false,
  currencies: currenciesProp = "all",
  variant = "default",
  className,
}: CurrencySelectProps) {
  const [open, setOpen] = React.useState(false);

  const currencyList = currenciesProp === "all" ? allCurrencies : currenciesProp;

  const selectedCurrency = React.useMemo(() => {
    return currencyList.find((currency) => currency.code === value);
  }, [value, currencyList]);

  const handleSelect = (currency: Currency) => {
    onValueChange?.(currency.code);
    onCurrencySelect?.(currency);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between",
            variant === "small" && "h-9 text-sm",
            !selectedCurrency && "text-muted-foreground",
            className
          )}
        >
          {selectedCurrency
            ? `${selectedCurrency.code} - ${selectedCurrency.symbol}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {currencyList.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={`${currency.code} ${currency.name} ${currency.symbol}`}
                  onSelect={() => handleSelect(currency)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === currency.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{currency.code}</span>
                    <span className="text-muted-foreground">
                      {currency.symbol}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      - {currency.name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { allCurrencies };

