
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { WhatsappTemplate, CreateWhatsappTemplateInput, UpdateWhatsappTemplateInput, DashboardStats, WhatsappMessageType } from '../../server/src/schema';

function App() {
  // Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  
  // WhatsApp Templates
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsappTemplate | null>(null);

  // Form state for creating/editing templates
  const [formData, setFormData] = useState<CreateWhatsappTemplateInput>({
    name: '',
    type: 'THANK_YOU',
    content: '',
    created_by_id: 1 // Default user ID - in real app this would come from auth
  });

  // Load dashboard stats
  const loadDashboardStats = useCallback(async () => {
    try {
      const stats = await trpc.getDashboardStats.query();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  }, []);

  // Load WhatsApp templates
  const loadTemplates = useCallback(async () => {
    try {
      const result = await trpc.getWhatsappTemplates.query();
      setTemplates(result);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, []);

  useEffect(() => {
    loadDashboardStats();
    loadTemplates();
  }, [loadDashboardStats, loadTemplates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingTemplate) {
        // Update existing template
        const updateData: UpdateWhatsappTemplateInput = {
          id: editingTemplate.id,
          name: formData.name,
          type: formData.type,
          content: formData.content
        };
        const response = await trpc.updateWhatsappTemplate.mutate(updateData);
        setTemplates((prev: WhatsappTemplate[]) => 
          prev.map(template => template.id === response.id ? response : template)
        );
        setEditingTemplate(null);
      } else {
        // Create new template
        const response = await trpc.createWhatsappTemplate.mutate(formData);
        setTemplates((prev: WhatsappTemplate[]) => [...prev, response]);
      }
      
      // Reset form
      setFormData({
        name: '',
        type: 'THANK_YOU',
        content: '',
        created_by_id: 1
      });
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (template: WhatsappTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      content: template.content,
      created_by_id: template.created_by_id
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteWhatsappTemplate.mutate({ id });
      setTemplates((prev: WhatsappTemplate[]) => prev.filter(template => template.id !== id));
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      type: 'THANK_YOU',
      content: '',
      created_by_id: 1
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'THANK_YOU': return 'bg-green-100 text-green-800';
      case 'REMINDER': return 'bg-yellow-100 text-yellow-800';
      case 'FOLLOW_UP': return 'bg-blue-100 text-blue-800';
      case 'PROMOTION': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'THANK_YOU': return '🙏';
      case 'REMINDER': return '⏰';
      case 'FOLLOW_UP': return '📞';
      case 'PROMOTION': return '🎯';
      default: return '💬';
    }
  };

  const handleTypeChange = (value: WhatsappMessageType) => {
    setFormData((prev: CreateWhatsappTemplateInput) => ({ ...prev, type: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🚗 Automotive CRM</h1>
          <p className="text-gray-600">Professional automotive service management system</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="whatsapp">💬 WhatsApp Templates</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="automotive-gradient text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <span className="text-2xl">📋</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats?.total_orders || 0}</div>
                  <p className="text-xs text-blue-100">All service orders</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                  <span className="text-2xl">⚙️</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{dashboardStats?.orders_in_progress || 0}</div>
                  <p className="text-xs text-muted-foreground">Active service orders</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <span className="text-2xl">✅</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{dashboardStats?.completed_orders || 0}</div>
                  <p className="text-xs text-muted-foreground">Finished orders</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                  <span className="text-2xl">💰</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{dashboardStats?.pending_payments || 0}</div>
                  <p className="text-xs text-muted-foreground">Awaiting payment</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <span className="text-2xl">💵</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${dashboardStats?.total_revenue ? dashboardStats.total_revenue.toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">Paid invoices</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
                  <span className="text-2xl">⏱️</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboardStats?.avg_completion_time ? dashboardStats.avg_completion_time.toFixed(1) : '0.0'} days
                  </div>
                  <p className="text-xs text-muted-foreground">Average turnaround</p>
                </CardContent>
              </Card>
            </div>

            {/* Service Overview Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🔧 Service Types
                  </CardTitle>
                  <CardDescription>Most common automotive services</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">General Service</span>
                    <Badge variant="secondary">45%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Brake Service</span>
                    <Badge variant="secondary">28%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Engine Service</span>
                    <Badge variant="secondary">15%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">AC Service</span>
                    <Badge variant="secondary">12%</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    👥 Team Roles
                  </CardTitle>
                  <CardDescription>Current staff distribution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Mechanics</span>
                    <Badge className="bg-blue-100 text-blue-800">8 Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Kabeng (Foreman)</span>
                    <Badge className="bg-purple-100 text-purple-800">2 Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Planners</span>
                    <Badge className="bg-green-100 text-green-800">3 Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Admins</span>
                    <Badge className="bg-orange-100 text-orange-800">2 Active</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* WhatsApp Templates Tab */}
          <TabsContent value="whatsapp" className="space-y-6">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💬 {editingTemplate ? 'Edit Template' : 'Create WhatsApp Template'}
                </CardTitle>
                <CardDescription>
                  {editingTemplate ? 'Update your existing template' : 'Create automated WhatsApp message templates for customer communication'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Template Name</label>
                      <Input
                        placeholder="e.g., Service Complete Thank You"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateWhatsappTemplateInput) => ({ ...prev, name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Message Type</label>
                      <Select 
                        value={formData.type || 'THANK_YOU'} 
                        onValueChange={handleTypeChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select message type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="THANK_YOU">🙏 Thank You</SelectItem>
                          <SelectItem value="REMINDER">⏰ Reminder</SelectItem>
                          <SelectItem value="FOLLOW_UP">📞 Follow Up</SelectItem>
                          <SelectItem value="PROMOTION">🎯 Promotion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Message Content</label>
                    <Textarea
                      placeholder="Hi there! Thank you for choosing our automotive service! Your vehicle has been completed successfully. We appreciate your trust in our team! 🚗✨"
                      value={formData.content}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData((prev: CreateWhatsappTemplateInput) => ({ ...prev, content: e.target.value }))
                      }
                      rows={4}
                      required
                    />
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium mb-1">💡 Pro Tip: Use dynamic placeholders</p>
                      <p className="text-xs text-blue-600">
                        Use <code className="bg-blue-100 px-1 rounded">{'{{customer_name}}'}</code> and{' '}
                        <code className="bg-blue-100 px-1 rounded">{'{{order_number}}'}</code> for personalization
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : editingTemplate ? (
                        <>✏️ Update Template</>
                      ) : (
                        <>✨ Create Template</>
                      )}
                    </Button>
                    {editingTemplate && (
                      <Button type="button" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Templates List */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">📋 Existing Templates</span>
                  <Badge variant="secondary">{templates.length} Templates</Badge>
                </CardTitle>
                <CardDescription>Manage your WhatsApp message templates</CardDescription>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📝</div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No templates yet</h3>
                    <p className="text-gray-500 mb-4">Create your first WhatsApp template to get started!</p>
                    <div className="flex justify-center gap-2 text-sm text-gray-400">
                      <span>💡 Tip: Start with a "Thank You" template</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {templates.map((template: WhatsappTemplate) => (
                      <div key={template.id} className="template-card animate-fade-in">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getTypeIcon(template.type)}</span>
                            <div>
                              <h3 className="font-semibold text-lg">{template.name}</h3>
                              <Badge className={getTypeColor(template.type)}>
                                {template.type.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEdit(template)}
                              className="flex items-center gap-1"
                            >
                              ✏️ Edit
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="flex items-center gap-1">
                                  🗑️ Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(template.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4 mb-3 border-l-4 border-blue-400">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {template.content}
                          </p>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <div className="flex items-center gap-4">
                            <span>📅 Created: {template.created_at.toLocaleDateString()}</span>
                            {template.updated_at && (
                              <span>🔄 Updated: {template.updated_at.toLocaleDateString()}</span>
                            )}
                          </div>
                          <Badge variant={template.is_active ? "default" : "secondary"} className="text-xs">
                            {template.is_active ? '✅ Active' : '❌ Inactive'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Template Usage Guide */}
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  📚 Template Usage Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="bg-white p-3 rounded-lg border border-green-100">
                    <h4 className="font-medium text-green-800 mb-2">🙏 Thank You Templates</h4>
                    <p className="text-sm text-gray-600">Sent after service completion to show appreciation</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-yellow-100">
                    <h4 className="font-medium text-yellow-800 mb-2">⏰ Reminder Templates</h4>
                    <p className="text-sm text-gray-600">For maintenance schedules and appointments</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-2">📞 Follow Up Templates</h4>
                    <p className="text-sm text-gray-600">Check customer satisfaction after service</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-100">
                    <h4 className="font-medium text-purple-800 mb-2">🎯 Promotion Templates</h4>
                    <p className="text-sm text-gray-600">Special offers and seasonal campaigns</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
