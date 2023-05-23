import { MOCK_ITINERARY } from '@/data';
import { ItineraryRequirements } from '@/lib/generateItinerary';
import { OpenAIStream } from '@/utils/api/OpenAIStream';
import { createItineraryPrompt } from '@/utils/createItineraryPrompt';
import { NextResponse } from 'next/server';

type GenerateItineraryRequest = Request & {
    body: Partial<ItineraryRequirements>;
}

if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OpenAPI Key");
}

export const runtime = 'edge';

export async function POST(request: GenerateItineraryRequest) {
    const itineraryRequirements = await request.json() as ItineraryRequirements;

    if (!itineraryRequirements) {
        return NextResponse.json({ error: { message: "No itinerary requirements found" }, status: 400 });
    } else if (!itineraryRequirements.destinations) {
        return NextResponse.json({ error: { message: "No destinations found" }, status: 400 });
    } else if (!itineraryRequirements.duration) {
        return NextResponse.json({ error: { message: "No duration entered" }, status: 400 });
    }

    try {
        if (process.env.NODE_ENV === 'development' && process.env.MOCK === 'true') {
            return NextResponse.json({ result: MOCK_ITINERARY });
        }

        const prompt = createItineraryPrompt(itineraryRequirements);
        const stream = await OpenAIStream({
            model: "gpt-3.5-turbo",
            messages: [{ role: 'user', content: prompt }],
            stream: true
        })

        return new Response(stream)
    } catch (error: any) {
        if (error.response) {
            console.error("POST generate-itinerary: Error with response:", error.response.status, error.response.data);
            return NextResponse.json(error.response.data, { status: error.response.status });
        } else {
            console.error(`POST generate-itinerary: Error with request: ${error.message}`);
            return NextResponse.json({ error: { message: 'An error occurred during your request.', } }, { status: 500 });
        }
    }
}