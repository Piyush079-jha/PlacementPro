import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Briefcase, MapPin, DollarSign, ExternalLink, Search, Star, Users } from 'lucide-react';

const typeColors = {
  'Full-time': 'bg-green-500/10 text-green-400',
  'Internship': 'bg-blue-500/10 text-blue-400',
  'Remote': 'bg-purple-500/10 text-purple-400',
  'Part-time': 'bg-yellow-500/10 text-yellow-400'
};

const JobCard = ({ job, onApply }) => {
  const hasLink = job.applyLink && job.applyLink !== '#';

  const handleApply = (e) => {
    if (!hasLink) {
      e.preventDefault();
      toast.error('Application link not available for this job');
      return;
    }
    onApply(job._id);
  };

  return (
    <div className={`card hover:scale-[1.01] transition-all duration-200 ${job.isFeatured ? 'border border-primary-500/25' : ''}`}>
      {job.isFeatured && (
        <div className="flex items-center gap-1 text-xs text-primary-400 font-medium mb-3">
          <Star className="w-3 h-3 fill-current" /> Featured
        </div>
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 border border-primary-500/20 flex items-center justify-center text-sm font-bold text-primary-300">
            {job.company?.[0] || 'C'}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm leading-snug">{job.title}</h3>
            <p className="text-gray-500 text-xs">{job.company}</p>
          </div>
        </div>
        <span className={`badge ${typeColors[job.type] || 'bg-gray-500/10 text-gray-400'} flex-shrink-0`}>{job.type}</span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
        {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
        {job.salary && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{job.salary}</span>}
        {job.applicants > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{job.applicants} applied</span>}
      </div>

      {job.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.skills.slice(0, 4).map((s, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-white/4 text-gray-400 border border-white/6">{s}</span>
          ))}
          {job.skills.length > 4 && <span className="text-xs text-gray-600">+{job.skills.length - 4} more</span>}
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
        <a
          href={hasLink ? job.applyLink : undefined}
          target={hasLink ? '_blank' : undefined}
          rel="noopener noreferrer"
          onClick={handleApply}
          className={`btn-primary text-xs py-2 px-4 flex items-center gap-1.5 flex-1 justify-center ${!hasLink ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Apply Now <ExternalLink className="w-3 h-3" />
        </a>
        {job.source && <span className="text-xs text-gray-600 truncate">{job.source}</span>}
      </div>
    </div>
  );
};

export default function JobPortal() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search) params.append('search', search);
      if (type !== 'All') params.append('type', type);
      const res = await axios.get(`/api/jobs?${params}`);
      setJobs(res.data.jobs);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const seedJobs = async () => {
    setSeeding(true);
    try {
      await axios.post('/api/jobs/seed');
      toast.success('Sample jobs loaded!');
      fetchJobs();
    } catch (err) {
      toast.error('Failed to load sample jobs');
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => { fetchJobs(); }, [page, type]);
  useEffect(() => { setPage(1); fetchJobs(); }, [search]);

  const handleApply = async (jobId) => {
    try { await axios.post(`/api/jobs/${jobId}/apply`); } catch {}
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Job Portal</h1>
        <p className="text-gray-500">Verified fresher-friendly jobs from top Indian companies</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search jobs, companies, skills..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field w-full sm:w-40" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
          {['All', 'Full-time', 'Internship', 'Remote', 'Part-time'].map(t => <option key={t}>{t}</option>)}
        </select>
        <button onClick={seedJobs} disabled={seeding} className="btn-ghost text-xs py-2.5 px-4 whitespace-nowrap disabled:opacity-50">
          {seeding ? 'Loading...' : '+ Load Sample Jobs'}
        </button>
      </div>

      <p className="text-sm text-gray-500">{total} jobs found</p>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-52 rounded-2xl bg-white/3 animate-pulse" />)}
        </div>
      ) : jobs.length > 0 ? (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map(job => <JobCard key={job._id} job={job} onApply={handleApply} />)}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-sm py-2 px-4 disabled:opacity-30">← Prev</button>
              <span className="text-gray-500 text-sm">Page {page} of {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-ghost text-sm py-2 px-4 disabled:opacity-30">Next →</button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-gray-600">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No jobs found</p>
          <p className="text-sm mt-1 mb-4">Try loading sample jobs or adjusting your filters</p>
          <button onClick={seedJobs} className="btn-primary text-sm py-2 px-6">Load Sample Jobs</button>
        </div>
      )}
    </div>
  );
}