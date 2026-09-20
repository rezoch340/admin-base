'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterFieldDefinition<FilterKey extends string> {
  key: FilterKey;
  label: string;
  type?: 'text' | 'number' | 'datetime-local' | 'select';
  placeholder?: string;
  options?: FilterOption[];
}

export function FilterBar<FilterKey extends string>({
  fields,
  values,
  onChange,
  onSubmit,
  onReset,
  advancedKeys = [],
  extra,
}: {
  fields: Array<FilterFieldDefinition<FilterKey>>;
  values: Record<FilterKey, string>;
  onChange: (key: FilterKey, value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  // 这些字段收进「高级筛选」,默认折叠;有值时自动展开
  advancedKeys?: FilterKey[];
  // 塞在按钮行左边的东西,比如时间快捷范围
  extra?: ReactNode;
}) {
  const { translate } = useI18n();
  const advancedFields = fields.filter((field) => advancedKeys.includes(field.key));
  const primaryFields = fields.filter((field) => !advancedKeys.includes(field.key));
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(() =>
    advancedFields.some((field) => values[field.key]),
  );
  const showAdvanced =
    isAdvancedOpen || advancedFields.some((field) => values[field.key]);

  const renderField = (field: FilterFieldDefinition<FilterKey>) => (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={`filter-${field.key}`}>{field.label}</Label>
          {field.type === 'select' ? (
            <Select
              value={values[field.key] || null}
              // items 让触发器显示中文标签,而不是提交给接口的原始值
              items={field.options}
              onValueChange={(selectedValue) =>
                onChange(
                  field.key,
                  typeof selectedValue === 'string' ? selectedValue : '',
                )
              }
            >
              <SelectTrigger
                id={`filter-${field.key}`}
                className="w-full"
                aria-label={field.label}
              >
                <SelectValue
                  placeholder={field.placeholder ?? translate('common.all')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>
                  {field.placeholder ?? translate('common.all')}
                </SelectItem>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`filter-${field.key}`}
              type={field.type ?? 'text'}
              value={values[field.key]}
              placeholder={field.placeholder}
              onChange={(changeEvent) =>
                onChange(field.key, changeEvent.target.value)
              }
            />
          )}
        </div>
  );

  return (
    <form
      className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      onSubmit={(formEvent) => {
        formEvent.preventDefault();
        onSubmit();
      }}
    >
      {primaryFields.map(renderField)}
      {advancedFields.length > 0 && showAdvanced && (
        <div className="col-span-full grid gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {advancedFields.map(renderField)}
        </div>
      )}
      <div className="col-span-full flex flex-wrap items-center gap-2">
        {extra}
        {advancedFields.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={showAdvanced}
            className="text-muted-foreground"
            onClick={() => setIsAdvancedOpen((current) => !current)}
          >
            {translate('common.advancedFilters')}
            <ChevronDown
              className={showAdvanced ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </Button>
        )}
        <span className="ml-auto flex gap-2">
          <Button type="button" variant="outline" onClick={onReset}>
            <RotateCcw />
            {translate('common.reset')}
          </Button>
          <Button type="submit">
            <Search />
            {translate('common.search')}
          </Button>
        </span>
      </div>
    </form>
  );
}
