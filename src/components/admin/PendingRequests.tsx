import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface PendingRequest {
  id: string;
  created_at: string;
  status: string;
  type: string;
  original_filename?: string;
  reject_reason?: string;
  wallpaper_id?: string;
  r2_key?: string;
  request_type: 'upload' | 'delete';
}

export const PendingRequests = () => {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch upload requests
      const { data: uploadRequests } = await supabase
        .from('upload_requests')
        .select('id, created_at, status, type, original_filename, reject_reason')
        .eq('requested_by', session.user.id)
        .order('created_at', { ascending: false });

      // Fetch delete requests
      const { data: deleteRequests } = await supabase
        .from('delete_requests')
        .select('id, created_at, status, wallpaper_id, r2_key, reason')
        .eq('requested_by', session.user.id)
        .order('created_at', { ascending: false });

      // Combine and format requests
      const allRequests: PendingRequest[] = [
        ...(uploadRequests || []).map(req => ({
          ...req,
          request_type: 'upload' as const
        })),
        ...(deleteRequests || []).map(req => ({
          id: req.id,
          created_at: req.created_at,
          status: req.status,
          type: 'delete',
          r2_key: req.r2_key,
          wallpaper_id: req.wallpaper_id,
          reject_reason: req.reason,
          request_type: 'delete' as const
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPendingRequests(allRequests);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Requests</CardTitle>
        <CardDescription>
          Track the status of your upload and delete requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingRequests.length > 0 ? (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(request.status)}
                    <span className="font-medium">
                      {request.request_type === 'upload' ? 'Upload Request' : 'Delete Request'}
                    </span>
                    {getStatusBadge(request.status)}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="text-sm">
                  {request.request_type === 'upload' ? (
                    <div>
                      <span className="font-medium">File:</span> {request.original_filename}
                      <br />
                      <span className="font-medium">Type:</span> {request.type}
                    </div>
                  ) : (
                    <div>
                      <span className="font-medium">Wallpaper:</span> {request.r2_key}
                    </div>
                  )}
                </div>

                {request.status === 'rejected' && request.reject_reason && (
                  <div className="text-sm bg-red-50 border border-red-200 rounded p-2">
                    <span className="font-medium text-red-700">Rejection Reason:</span>
                    <p className="text-red-600 mt-1">{request.reject_reason}</p>
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded p-2">
                    Your request is being reviewed by admins
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No requests found
          </div>
        )}
      </CardContent>
    </Card>
  );
};