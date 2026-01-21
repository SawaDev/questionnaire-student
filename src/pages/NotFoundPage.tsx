import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileQuestion } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
            <div>
              <CardTitle>Page Not Found</CardTitle>
              <CardDescription>The page you're looking for doesn't exist</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The page you're trying to access may have been moved, deleted, or doesn't exist.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/dashboard')} className="flex-1">
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
