import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface UploadRequest {
  id: string;
  requested_by: string;
  created_at: string;
  status: string;
  type: string;
  tags: string[];
  original_filename: string;
  staging_key: string;
  message?: string;
  reject_reason?: string;
  creator_info?: { email: string };
}

export const UploadRequests = () => {
  const [uploadRequests, setUploadRequests] = useState<UploadRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<UploadRequest | null>(null);

  useEffect(() => {
    fetchUploadRequests();
  }, []);

  const fetchUploadRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('upload_requests')
        .select(`
          *,
          creator_info:creators!upload_requests_requested_by_fkey(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUploadRequests((data as unknown as UploadRequest[]) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch upload requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('approve-upload-request', {
        body: { 
          requestId,
          adminId: session.user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Upload request approved and wallpaper published",
      });

      fetchUploadRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve upload request",
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string, reason: string) => {
    setProcessingRequest(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('upload_requests')
        .update({
          status: 'rejected',
          approved_by: session.user.id,
          approved_at: new Date().toISOString(),
          reject_reason: reason
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Upload request rejected",
      });

      setRejectReason("");
      setSelectedRequest(null);
      fetchUploadRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject upload request",
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingRequests = uploadRequests.filter(req => req.status === 'pending');
  const processedRequests = uploadRequests.filter(req => req.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Upload Requests</CardTitle>
          <CardDescription>
            Review and approve or reject creator upload requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.creator_info?.email || 'Unknown'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {request.original_filename}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {request.tags?.slice(0, 2).join(', ')}
                      {request.tags?.length > 2 && '...'}
                    </TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Upload Request Details</DialogTitle>
                            <DialogDescription>
                              Review the details of this upload request
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <strong>Creator:</strong> {request.creator_info?.email || 'Unknown'}
                            </div>
                            <div>
                              <strong>Filename:</strong> {request.original_filename}
                            </div>
                            <div>
                              <strong>Type:</strong> {request.type}
                            </div>
                            <div>
                              <strong>Tags:</strong> {request.tags?.join(', ') || 'None'}
                            </div>
                            {request.message && (
                              <div>
                                <strong>Message:</strong>
                                <p className="mt-1 text-sm text-muted-foreground">{request.message}</p>
                              </div>
                            )}
                            <div>
                              <strong>Requested:</strong> {new Date(request.created_at).toLocaleString()}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApproveRequest(request.id)}
                        disabled={processingRequest === request.id}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                            disabled={processingRequest === request.id}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject Upload Request</DialogTitle>
                            <DialogDescription>
                              Please provide a reason for rejecting this request
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              placeholder="Reason for rejection..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequest(null);
                                  setRejectReason("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  if (selectedRequest) {
                                    handleRejectRequest(selectedRequest.id, rejectReason);
                                  }
                                }}
                                disabled={!rejectReason.trim()}
                              >
                                Reject Request
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No pending upload requests.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Processed Requests</CardTitle>
          <CardDescription>
            Previously approved or rejected upload requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.slice(0, 10).map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.creator_info?.email || 'Unknown'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {request.original_filename}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {request.reject_reason || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No processed requests yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};