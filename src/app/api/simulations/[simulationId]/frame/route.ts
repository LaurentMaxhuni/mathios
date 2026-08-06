import { NextResponse } from "next/server";
import { z } from "zod";
import { asApplicationError } from "@/domain/errors/application-error";
import { getRegisteredSimulation } from "@/domain/simulation/registry";
import { advanceSimulation } from "@/domain/simulation/rules";

const bodySchema = z.object({
  inputs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  state: z.record(z.string(), z.number()).default({}),
  deltaSeconds: z.number().min(0).max(5).default(0),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ simulationId: string }> },
) {
  try {
    const { simulationId } = await params;
    const definition = getRegisteredSimulation(simulationId);
    if (!definition)
      return NextResponse.json({ message: "Simulation not found." }, { status: 404 });
    const body = bodySchema.safeParse(await request.json());
    if (!body.success)
      return NextResponse.json({ message: "Invalid simulation frame." }, { status: 400 });
    return NextResponse.json(
      advanceSimulation(definition, body.data.state, body.data.inputs, body.data.deltaSeconds),
    );
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
