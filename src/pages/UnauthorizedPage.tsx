import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>You don't have permission to access this resource</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This attempt doesn't belong to you, or you don't have the necessary permissions to view it.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/dashboard')} className="flex-1">
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/login')} className="flex-1">
              Login Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
