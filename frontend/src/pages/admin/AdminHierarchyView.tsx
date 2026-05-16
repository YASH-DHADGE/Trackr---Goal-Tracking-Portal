import { useState, useEffect } from 'react';
import { Loader2, Users, ChevronRight, ChevronDown } from 'lucide-react';
import apiClient from '../../api/client';

export default function AdminHierarchyView() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiClient.get('/users')
      .then(r => setUsers(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

  // Build tree
  const childrenMap: Record<string, any[]> = {};
  const rootUsers: any[] = [];

  users.forEach(u => {
    if (u.manager_id) {
      if (!childrenMap[u.manager_id]) childrenMap[u.manager_id] = [];
      childrenMap[u.manager_id].push(u);
    } else {
      rootUsers.push(u);
    }
  });

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (user: any, level: number = 0) => {
    const children = childrenMap[user.id] || [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded[user.id] !== false; // Default expanded

    return (
      <div key={user.id} className="w-full">
        <div 
          className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 ${level > 0 ? 'mt-1' : 'mb-2 bg-slate-50 border-slate-100'}`}
          style={{ marginLeft: `${level * 2}rem` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(user.id)} className="p-1 hover:bg-slate-200 rounded text-slate-500">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6" /> // spacer
          )}
          
          <div className={`p-2 rounded-lg ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : user.role === 'manager' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
            <Users className="w-4 h-4" />
          </div>
          
          <div>
            <p className="font-semibold text-slate-800">{user.full_name}</p>
            <div className="flex gap-2 text-xs text-slate-500 mt-0.5">
              <span>{user.email}</span>
              <span>•</span>
              <span className="uppercase tracking-wider font-medium">{user.role}</span>
              {user.designation && (
                <>
                  <span>•</span>
                  <span>{user.designation}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l-2 border-slate-100 ml-6 pl-2 mt-1 mb-2">
            {children.map(c => renderNode(c, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">Organization Hierarchy</h3>
        <p className="text-sm text-slate-500">Visual reporting structure of all active users.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 overflow-x-auto">
        {rootUsers.map(u => renderNode(u, 0))}
        {rootUsers.length === 0 && <p className="text-slate-500 text-center py-8">No users found.</p>}
      </div>
    </div>
  );
}
