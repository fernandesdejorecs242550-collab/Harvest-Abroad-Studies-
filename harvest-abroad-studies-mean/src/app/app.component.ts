import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Enquiry {
  name: string;
  email: string;
  phone: string;
  destination: string;
  studyLevel: string;
  message: string;
}
interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
}

@Component({
  selector: 'has-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  year = new Date().getFullYear();
  menuOpen = false;
  openFaq = -1; // start collapsed
  chatOpen = false;
  chatBusy = false;
  submitting = false;
  formMessage = '';
  formError = false;
  chatInput = '';
  chatMessages: ChatMessage[] = [];
  enquiry: Enquiry = { name: '', email: '', phone: '', destination: '', studyLevel: '', message: '' };

  faqs = [
    { q: 'When should I start planning to study abroad?', a: 'It is useful to start early because course deadlines, document preparation and visa processes vary by destination and institution. Share your intended intake with a counsellor so you can make a realistic timeline.' },
    { q: 'Can you help me choose a country and course?', a: 'Yes. Start by considering your academic background, subject interests, budget, language requirements and long-term goals. A counsellor can help you compare options; final eligibility is determined by each institution.' },
    { q: 'What documents might I need?', a: 'Requirements vary, but may include academic transcripts, passport, English-language test results, a statement of purpose, recommendation letters and financial documents. Check the official institution and visa guidance for your specific case.' },
    { q: 'Do you guarantee admission or a visa?', a: 'No responsible adviser can guarantee admission or a visa. Decisions are made by the relevant university and immigration authority. We can help you understand the process and prepare your application.' },
    { q: 'How much do the packages cost?', a: 'Fees depend on the support required and the destination. The package cards are illustrative only; contact Harvest Abroad Studies for verified services, inclusions and pricing before making a decision.' }
  ];

  constructor(private http: HttpClient) {}

  chooseDestination(destination: string) {
    this.enquiry.destination = destination === 'Other' ? 'Other' : destination;
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  }

  choosePackage(packageName: string) {
    this.enquiry.message = `I would like to know more about the ${packageName} package.`;
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  }

  submitEnquiry() {
    this.submitting = true;
    this.formMessage = '';
    this.formError = false;
    this.http.post<{ message: string }>('/api/enquiries', this.enquiry).subscribe({
      next: res => {
        this.formMessage = res.message || 'Thanks! Your enquiry has been received.';
        this.enquiry = { name: '', email: '', phone: '', destination: '', studyLevel: '', message: '' };
        this.submitting = false;
      },
      error: () => {
        this.formError = true;
        this.formMessage = 'We could not submit your enquiry right now. Please try again later or contact the team directly.';
        this.submitting = false;
      }
    });
  }

  sendChat() {
    const question = this.chatInput.trim();
    if (!question || this.chatBusy) return;
    this.chatMessages.push({ role: 'user', text: question });
    this.chatInput = '';
    this.chatBusy = true;
    this.http.post<{ reply: string }>('/api/chat', { message: question }).subscribe({
      next: res => {
        this.chatMessages.push({ role: 'assistant', text: res.reply || this.localAnswer(question) });
        this.chatBusy = false;
      },
      error: () => {
        this.chatMessages.push({ role: 'assistant', text: this.localAnswer(question) });
        this.chatBusy = false;
      }
    });
  }

  private localAnswer(question: string): string {
    const q = question.toLowerCase();
    if (q.includes('cost') || q.includes('fee') || q.includes('budget'))
      return 'Costs vary by country, course, university and living expenses. Share your preferred destination and budget in the enquiry form so a counsellor can discuss options.';
    if (q.includes('visa'))
      return 'Visa requirements depend on the destination and your circumstances. Check the official immigration website for current requirements.';
    if (q.includes('document'))
      return 'Common documents include transcripts, passport, language-test results, statement of purpose and financial evidence.';
    if (q.includes('europe') || q.includes('usa') || q.includes('canada') || q.includes('uk') || q.includes('australia') || q.includes('germany') || q.includes('ireland'))
      return 'The best destination depends on your course, budget, academic profile and goals. Use the destination cards, then send an enquiry for personalised guidance.';
    if (q.includes('admission') || q.includes('apply') || q.includes('application'))
      return 'Start by shortlisting courses, checking entry requirements and deadlines, and preparing documents. Confirm details on official university websites.';
    return 'I can help with general questions about destinations, applications, documents, budgets and planning. For personalised advice, share your preferred course and destination through the enquiry form.';
  }
}
