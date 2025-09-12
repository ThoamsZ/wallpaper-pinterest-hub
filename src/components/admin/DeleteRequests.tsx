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

interface DeleteRequest {
  id: string;
  requested_by: string;
  created_at: string;
  status: string;
  wallpaper_id: string;
  r2_key: string;
  reason?: string;
  final_deleted: boolean;
  creators?: { email: string };
  wallpapers?: { url: string; type: string; compressed_url: string };
}

export const DeleteRequests = () => {
  const [deleteRequests, setDeleteRequests] = useState<DeleteRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<DeleteRequest | null>(null);

  useEffect(() => {
    fetchDeleteRequests();
  }, []);

  const fetchDeleteRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('delete_requests')
        .select(`
          *,
          creators!delete_requests_requested_by_fkey(email),
          wallpapers(url, type, compressed_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeleteRequests((data as unknown as DeleteRequest[]) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch delete requests",
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

      const { data, error } = await supabase.functions.invoke('approve-delete-request', {
        body: { 
          requestId,
          adminId: session.user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Delete request approved and wallpaper removed",
      });

      fetchDeleteRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve delete request",
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
        .from('delete_requests')
        .update({
          status: 'rejected',
          approved_by: session.user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Delete request rejected",
      });

      setRejectReason("");
      setSelectedRequest(null);
      fetchDeleteRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject delete request",
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

  const pendingRequests = deleteRequests.filter(req => req.status === 'pending');
  const processedRequests = deleteRequests.filter(req => req.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Delete Requests</CardTitle>
          <CardDescription>
            Review and approve or reject creator delete requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Wallpaper</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.creators?.email || 'Unknown'}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {request.wallpapers?.compressed_url && (
                          <img
                            src={request.wallpapers.compressed_url}
                            alt="Wallpaper"
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <span className="font-mono text-sm">{request.r2_key}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.wallpapers?.type || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.reason || 'No reason provided'}
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
                            <DialogTitle>Delete Request Details</DialogTitle>
                            <DialogDescription>
                              Review the details of this delete request
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <strong>Creator:</strong> {request.creators?.email || 'Unknown'}
                            </div>
                            <div>
                              <strong>Wallpaper ID:</strong> {request.wallpaper_id}
                            </div>
                            <div>
                              <strong>R2 Key:</strong> {request.r2_key}
                            </div>
                            <div>
                              <strong>Type:</strong> {request.wallpapers?.type || 'Unknown'}
                            </div>
                            {request.reason && (
                              <div>
                                <strong>Reason for deletion:</strong>
                                <p className="mt-1 text-sm text-muted-foreground">{request.reason}</p>
                              </div>
                            )}
                            <div>
                              <strong>Requested:</strong> {new Date(request.created_at).toLocaleString()}
                            </div>
                            {request.wallpapers?.compressed_url && (
                              <div>
                                <strong>Preview:</strong>
                                <img
                                  src={request.wallpapers.compressed_url}
                                  alt="Wallpaper preview"
                                  className="mt-2 max-w-full h-auto rounded border"
                                />
                              </div>
                            )}
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
                            <DialogTitle>Reject Delete Request</DialogTitle>
                            <DialogDescription>
                              Please provide a reason for rejecting this delete request
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
              <p className="text-muted-foreground">No pending delete requests.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Processed Requests</CardTitle>
          <CardDescription>
            Previously approved or rejected delete requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>R2 Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Deleted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.slice(0, 10).map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.creators?.email || 'Unknown'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {request.r2_key}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {request.final_deleted ? (
                        <Badge variant="default">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
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