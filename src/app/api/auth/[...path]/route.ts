import { getNeonAuth } from "@/lib/auth/server";

export const runtime = "nodejs";

type AuthRouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: Request, context: AuthRouteContext): Promise<Response> {
  return getNeonAuth().handler().GET(request, context);
}

export async function POST(request: Request, context: AuthRouteContext): Promise<Response> {
  return getNeonAuth().handler().POST(request, context);
}

export async function PUT(request: Request, context: AuthRouteContext): Promise<Response> {
  return getNeonAuth().handler().PUT(request, context);
}

export async function PATCH(request: Request, context: AuthRouteContext): Promise<Response> {
  return getNeonAuth().handler().PATCH(request, context);
}

export async function DELETE(request: Request, context: AuthRouteContext): Promise<Response> {
  return getNeonAuth().handler().DELETE(request, context);
}
