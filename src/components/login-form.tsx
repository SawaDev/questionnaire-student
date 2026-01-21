import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t } = useTranslation()

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)} {...props}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            {t("loginForm.title")}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {t("loginForm.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email" className="text-sm sm:text-base">
                  {t("loginForm.email")}
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("loginForm.emailPlaceholder")}
                  className="text-sm sm:text-base"
                  required
                />
              </Field>

              <Field>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
                  <FieldLabel htmlFor="password" className="text-sm sm:text-base">
                    {t("loginForm.password")}
                  </FieldLabel>
                  <a
                    href="#"
                    className="text-xs sm:text-sm underline-offset-4 hover:underline sm:ml-auto"
                  >
                    {t("loginForm.forgot")}
                  </a>
                </div>

                <Input
                  id="password"
                  type="password"
                  className="text-sm sm:text-base"
                  required
                />
              </Field>

              <Field className="flex flex-col gap-3">
                <Button type="submit" className="w-full sm:w-auto">
                  {t("loginForm.login")}
                </Button>

                <Button variant="outline" type="button" className="w-full sm:w-auto">
                  {t("loginForm.google")}
                </Button>

                <FieldDescription className="text-center text-xs sm:text-sm">
                  {t("loginForm.noAccount")}{" "}
                  <a href="#" className="underline underline-offset-4 hover:text-primary">
                    {t("loginForm.signUp")}
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
