import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { run } from '@ember/runloop';
import Pretender from 'pretender';
const { stringify } = JSON;

module('save foo', function(hooks) {
  setupTest(hooks);

  let server;
  let store;
  let foo;
  let bar1;
  let bar2;
  let baz;

  hooks.beforeEach(function() {
    store = this.owner.lookup('service:store');
    server = new Pretender;

    run(() => {
      store.pushPayload({
        foos: [
          {
            id: 1,
            name: 'Foo 1',
            bars: [1, 2],
            baz: null
          }
        ],
        bars: [
          {
            id: 1,
            name: 'Bar 1'
          },
          {
            id: 2,
            name: 'Bar 2'
          }
        ],
        bazs: [
          {
            id: 1,
            name: 'Baz 1'
          }
        ]
      });
    });

    foo = store.peekRecord('foo', 1);
    bar1 = store.peekRecord('bar', 1);
    bar2 = store.peekRecord('bar', 2);
    baz = store.peekRecord('baz', 1);
  });

  hooks.afterEach(function() {
    server.shutdown();
  });

  test('cause getURL is not a function', async function(assert) {
    assert.expect(1);

    const _baz = await foo.get('baz');

    assert.deepEqual(_baz, baz);
  });

  test('requesting hasMany regression (2.18 -> 3.7.0)', async function(assert) {
    // assert.expect(8);

    let count = 0;

    server.get('/bars/1', () => {
      count++;

      return [200, {}, stringify({
        bar: {
          id: 1,
          name: 'Bar 1*'
        }
      })];
    });

    let _bars = await foo.get('bars');

    assert.equal(_bars.get('length'), 2);
    assert.equal(store.peekAll('bar').get('length'), 2);
    assert.equal(bar1.name, 'Bar 1');

    bar1.unloadRecord();

    assert.equal(_bars.get('length'), 1);
    assert.equal(store.peekAll('bar').get('length'), 1);
    assert.equal(bar1.name, 'Bar 1');
    assert.equal(bar1.isDestroying, true);
    assert.equal(bar1.isDestroyed, false);

    _bars = await foo.get('bars');

    assert.equal(_bars.get('length'), 2);
    assert.equal(store.peekAll('bar').get('length'), 2);
    assert.equal(bar1.name, 'Bar 1');
    assert.equal(bar1.isDestroying, true);
    assert.equal(bar1.isDestroyed, true); // ?

    assert.equal(count, 0, 'should not make a request for bars');
  });
});
