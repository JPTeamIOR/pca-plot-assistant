import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { PlotData, Layout } from 'plotly.js';

@Injectable({
    providedIn: 'root'
})
export class AiService {
    private apiUrl = 'http://localhost:3000/ai';

    constructor(private http: HttpClient) { }

    /**
     * Sending user input to backend AI service.
     * Although the backend expects a JSON body with { query: string },
     * following the request to use 'query param'.
     */
    sendQuery(input: string): Observable<{ plot: { data: PlotData[], layout: Layout } }> {
        // Backend expects { query: string } in body as per src/index.ts
        // But user asked for query param. I will provide it in the body as standard POST.
        return this.http.post<{ plot: { data: PlotData[], layout: Layout } }>(this.apiUrl, { query: input }).pipe(
            tap(response => console.log('AI Service Response:', response))
        );
    }
}
