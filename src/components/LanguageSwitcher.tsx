import i18n from 'i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { GB, RU, UZ } from 'country-flag-icons/react/3x2';

const languages = [
  { code: 'en', label: 'English', Flag: GB },
  { code: 'ru', label: 'Русский', Flag: RU },
  { code: 'uz', label: "O'zbek", Flag: UZ },
];

export function LanguageSwitcher() {
  const current = (i18n.language || 'en').slice(0, 2);
  const currentLang =
    languages.find((l) => l.code === current) ?? languages[0];

  return (
    <Select value={current} onValueChange={(v) => i18n.changeLanguage(v)}>
      <SelectTrigger className="w-[150px] h-9 px-2">
        <SelectValue>
          <span className="flex items-center gap-2">
            <currentLang.Flag className="w-5 h-4 rounded-sm" />
            <span className="text-sm font-medium">{currentLang.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>

      <SelectContent align="end" className="w-[170px]">
        {languages.map(({ code, label, Flag }) => (
          <SelectItem key={code} value={code}>
            <span className="flex items-center gap-2">
              <Flag className="w-5 h-4 rounded-sm" />
              <span className="text-sm">{label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
