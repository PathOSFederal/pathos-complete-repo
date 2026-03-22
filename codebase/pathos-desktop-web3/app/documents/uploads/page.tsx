import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UploadsPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Upload & Ingest</h1>
        <p className="text-muted-foreground">Upload documents and email ingestion instructions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Upload interface will appear here</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Ingestion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Email ingestion instructions will appear here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
