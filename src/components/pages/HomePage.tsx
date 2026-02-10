import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Boxes, Users, Target, Award } from 'lucide-react';
import { useBlueprintsLibraryStore, type BlueprintSummary } from '../../store/blueprintsLibraryStore';
import { BlueprintCard } from './BlueprintCard';
import { v4 as uuidv4 } from 'uuid';

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const getBlueprintSummaries = useBlueprintsLibraryStore((state) => state.getBlueprintSummaries);
  const addBlueprint = useBlueprintsLibraryStore((state) => state.addBlueprint);

  const blueprints = getBlueprintSummaries();

  const filteredBlueprints = useMemo(() => {
    if (!searchQuery.trim()) return blueprints;
    const query = searchQuery.toLowerCase();
    return blueprints.filter(
      (bp) =>
        bp.title.toLowerCase().includes(query) ||
        bp.description.toLowerCase().includes(query) ||
        bp.createdBy.toLowerCase().includes(query) ||
        bp.status.toLowerCase().includes(query)
    );
  }, [blueprints, searchQuery]);

  const handleCreateNew = () => {
    const newId = uuidv4();
    addBlueprint({
      id: newId,
      title: 'Untitled Blueprint',
      description: '',
      impactedAudiences: [],
      businessBenefits: [],
      clientContacts: [],
      createdBy: '',
      lastModifiedBy: '',
      lastModifiedDate: new Date().toISOString(),
      version: '1.0',
      status: 'Draft',
      changeLog: [],
      nodes: [],
      edges: [],
      comments: [],
    });
    navigate(`/blueprint/${newId}`);
  };

  const handleOpenBlueprint = (blueprint: BlueprintSummary) => {
    navigate(`/blueprint/${blueprint.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Agentic Blueprint Designer</h1>
              <p className="text-sm text-slate-500">Design intelligent workflows for humans, agents, and automation</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero / Value Props Section */}
      <section className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold mb-3">
            Design the Future of Work
          </h2>
          <p className="text-purple-100 text-lg mb-8 max-w-2xl">
            Collaboratively design agentic workflows that seamlessly blend AI agents, automation, and human expertise.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-2">Shared Understanding</h3>
              <p className="text-sm text-purple-100">
                Develop a common vision across business, technical, and subject matter experts with visual blueprints everyone can understand.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-2">Identify Gaps Early</h3>
              <p className="text-sm text-purple-100">
                Spot issues and gaps in your workflow before writing code. Reduce rework and ensure a more resilient, relevant build.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-2">Create AI Champions</h3>
              <p className="text-sm text-purple-100">
                By co-creating across teams, you develop Agentic AI Champions who help advocate for and drive adoption.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search blueprints by name, description, owner, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            />
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            New Blueprint
          </button>
        </div>

        {/* Blueprints Grid */}
        {filteredBlueprints.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            {blueprints.length === 0 ? (
              <>
                <Boxes className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">No blueprints yet</h3>
                <p className="text-slate-500 mb-6">
                  Get started by creating your first agentic workflow blueprint.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Blueprint
                </button>
              </>
            ) : (
              <>
                <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">No results found</h3>
                <p className="text-slate-500">
                  Try adjusting your search query to find what you're looking for.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBlueprints.map((blueprint) => (
              <BlueprintCard
                key={blueprint.id}
                blueprint={blueprint}
                onClick={() => handleOpenBlueprint(blueprint)}
              />
            ))}
          </div>
        )}

        {/* Results count */}
        {filteredBlueprints.length > 0 && (
          <p className="text-sm text-slate-500 mt-4">
            Showing {filteredBlueprints.length} of {blueprints.length} blueprint{blueprints.length !== 1 ? 's' : ''}
          </p>
        )}
      </main>
    </div>
  );
}
