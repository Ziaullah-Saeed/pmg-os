import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Building2, Users, TrendingUp } from "lucide-react";
import { useListCompanies, useListContacts, useListLeads } from "@workspace/api-client-react";

export default function Intelligence() {
  const { data: companies } = useListCompanies();
  const { data: contacts } = useListContacts();
  const { data: leads } = useListLeads();

  const companyList = companies ?? [];
  const contactList = contacts ?? [];
  const leadList = leads ?? [];

  const avgFitScore = leadList.length
    ? Math.round(leadList.reduce((sum: number, l: any) => sum + (l.fitScore ?? l.fit_score ?? 0), 0) / leadList.length)
    : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BrainCircuit className="h-8 w-8 text-primary" />
          Intelligence & Research
        </h1>
        <p className="text-muted-foreground mt-1">Market research, ICP modeling, and competitor analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Companies Tracked</p>
                <p className="text-2xl font-bold mt-1">{companyList.length}</p>
              </div>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contacts Mapped</p>
                <p className="text-2xl font-bold mt-1">{contactList.length}</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Fit Score</p>
                <p className="text-2xl font-bold mt-1 text-primary">{avgFitScore}%</p>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Company Intelligence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {companyList.map((company: any) => (
              <div key={company.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50">
                <div className="space-y-1">
                  <p className="font-semibold">{company.name}</p>
                  <p className="text-sm text-muted-foreground">{company.industry} &bull; {company.location}</p>
                  {(company.painPoints ?? company.pain_points) && (
                    <p className="text-xs text-muted-foreground mt-1 max-w-md">{company.painPoints ?? company.pain_points}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={company.status === 'active_client' ? 'default' : 'secondary'} className="capitalize">
                    {company.status?.replace('_', ' ')}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">{company.fitScore ?? company.fit_score}%</p>
                    <p className="text-xs text-muted-foreground">Fit Score</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Decision Maker Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {contactList.map((contact: any) => (
              <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
                <div>
                  <p className="font-medium">{contact.firstName ?? contact.first_name} {contact.lastName ?? contact.last_name}</p>
                  <p className="text-sm text-muted-foreground">{contact.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  {(contact.isDecisionMaker ?? contact.is_decision_maker) && (
                    <Badge variant="outline" className="text-primary border-primary/30">Decision Maker</Badge>
                  )}
                  <Badge variant="secondary" className="capitalize">{(contact.authorityLevel ?? contact.authority_level)?.replace(/_/g, ' ')}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
