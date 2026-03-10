-- Enable RLS
ALTER TABLE public.argument_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.argument_graph_edges ENABLE ROW LEVEL SECURITY;

-- Nodes: users can manage nodes belonging to their sessions
CREATE POLICY "Users manage own argument graph nodes"
  ON public.argument_graph_nodes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stress_test_sessions
      WHERE id = argument_graph_nodes.session_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stress_test_sessions
      WHERE id = argument_graph_nodes.session_id
        AND user_id = auth.uid()
    )
  );

-- Edges: users can manage edges belonging to their sessions
CREATE POLICY "Users manage own argument graph edges"
  ON public.argument_graph_edges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stress_test_sessions
      WHERE id = argument_graph_edges.session_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stress_test_sessions
      WHERE id = argument_graph_edges.session_id
        AND user_id = auth.uid()
    )
  );
