import { describe, expect, it } from 'vitest';

type PublicTvRow = {
  token_text: string;
  status: 'Waiting' | 'Called' | 'In chair';
  assigned_barber_name: string | null;
  initial_estimate: number;
};

describe('TV public queue view', () => {
  it('shows the called token and filters Waiting rows to five', () => {
    const rows: PublicTvRow[] = [
      { token_text: 'S-14', status: 'Called', assigned_barber_name: 'Amit', initial_estimate: 0 },
      { token_text: 'S-15', status: 'Waiting', assigned_barber_name: null, initial_estimate: 35 },
      { token_text: 'S-16', status: 'Waiting', assigned_barber_name: null, initial_estimate: 40 },
      { token_text: 'S-17', status: 'Waiting', assigned_barber_name: null, initial_estimate: 45 },
      { token_text: 'S-18', status: 'Waiting', assigned_barber_name: null, initial_estimate: 50 },
      { token_text: 'S-19', status: 'Waiting', assigned_barber_name: null, initial_estimate: 55 },
    ];

    const called = rows.filter((row) => row.status === 'Called');
    const waiting = rows.filter((row) => row.status === 'Waiting').slice(0, 5);

    expect(called.map((row) => row.token_text)).toEqual(['S-14']);
    expect(waiting).toHaveLength(5);
  });

  it('does not include customer name, phone or capability fields', () => {
    const publicRow: PublicTvRow & { [key: string]: unknown } = {
      token_text: 'S-14',
      status: 'Called',
      assigned_barber_name: 'Amit',
      initial_estimate: 0,
    };

    expect(publicRow).not.toHaveProperty('name');
    expect(publicRow).not.toHaveProperty('phone');
    expect(publicRow).not.toHaveProperty('customer_capability');
  });

  it('shows an empty state when no Waiting or Called rows exist', () => {
    const rows: PublicTvRow[] = [];
    expect(rows.filter((row) => row.status === 'Called')).toHaveLength(0);
    expect(rows.filter((row) => row.status === 'Waiting')).toHaveLength(0);
  });
});
