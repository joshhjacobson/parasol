import kmeans from 'ml-kmeans';

// import { difference } from 'lodash-es';
import { scaleOrdinal, schemeCategory10 } from 'd3';

import standardize from '../util/standardize';
import format_data from '../util/format_data';

// specify default parameters with default values using JSDoc syntax
// source: http://usejsdoc.org/tags-param.html#optional-parameters-and-default-values

/**
 * Partition data into k clusters in which each data element belongs to
 * the cluster with the nearest mean.
 *
 * @param {number} k - number of clusters
 * @param {Object} chartIDs - charts that will display cluster colors
 * @param {Object} [palette = d3.schemeCategory10] - d3 categorical color palette mapping cluster ids to color
 * see {@link https://github.com/d3/d3-scale-chromatic#categorical} for complete list
 * @param {Object} [vars = null] - variables used for clustering. NOTE: var data must be numeric
 * @param {boolean} [std = true] - convert values to zscores to obtain unbiased clusters
 * @param {object} [options] - Option object
 * @param {number} [options.maxIterations = 100] - Maximum of iterations allowed
 * @param {number} [options.tolerance = 1e-6] - Error tolerance
 * @param {boolean} [options.withIterations = false] - Store clusters and centroids for each iteration
 * @param {function} [options.distanceFunction = squaredDistance] - Distance function to use between the points (from ml-distance-euclidean)
 * @param {number} [options.seed] - Seed for random initialization.
 * @param {string|Array<Array<number>>} [options.initialization = 'kmeans++'] - K centers in format [x,y,z,...] or a method for initialize the data:
 *  * You can either specify your custom start centroids, or select one of the following initialization method:
 *  * `'kmeans++'` will use the kmeans++ method as described by http://ilpubs.stanford.edu:8090/778/1/2006-13.pdf
 *  * `'random'` will choose K random different values.
 *  * `'mostDistant'` will choose the more distant points to a first random pick
 * @param {boolean} [hidden = true] - determines whether cluster axis will be displayed on charts (can be individually updated later)
 */

const cluster = (config, ps, flags) =>
  function(
    k,
    chartIDs = [],
    vars = null,
    palette = null,
    options = {},
    std = true,
    hidden = true
  ) {

    if (palette === null) {  // if no palette specified, default to schemeCategory10
      const scheme = scaleOrdinal(schemeCategory10);
      palette = d => scheme(Number(d['cluster']));
    // } else if (typeof(palette) == 'string') {
    //   const scheme = scaleOrdinal(palette);
    //   palette = d => scheme(Number(d['cluster']));
    } else {  // otherwise, use a categorical d3 palette from d3-scale-chromatic
              // for example, d3.schemeAccent, d3.schemeDark2, d3.schemePaired...
      const scheme = scaleOrdinal(palette);
      palette = d => scheme(Number(d['cluster']));
    }

    if (vars === null) {
      vars = config.vars;
    }

    let data = [];
    if (std === true) {
      data = standardize(config.data);
    } else {
      data = config.data;
    }

    // setup object to filter variables that will be used in clustering
    const cluster_vars = {};
    vars.forEach(v => {
      cluster_vars[v] = true;
    });

    // get data values in array of arrays for clustering
    // (values from each row object captured in array)
    const values = [];
    data.forEach(d => {
      const target = [];
      Object.entries(d).forEach(([key, value]) => {
        // only take values from variables listed in function argument
        if (cluster_vars[key] == true) {
          target.push(Number(value));
        }
      });
      values.push(target);
    });

    // preform clustering and update config data
    const result = kmeans(values, k, options);
    config.data.forEach((d, i) => {
      d.cluster = result.clusters[i].toString();
    });
    console.log('kmeans++');
    console.log(result.iterations, result.centroids.map(c => c.error));
    console.log(result.centroids);

    // TODO: this isn't working correctly, cluster axis still shown
    // hide cluster axis and show colors by default
    if (hidden == true) {
      Object.keys(config.partition).forEach(id => {
        config.partition[id].push('cluster');
      });
    }

    // format data, update charts
    config.data = format_data(config.data);
    ps.charts.forEach(pc => {
      pc.data(config.data)
        .render()
        .createAxes();
      // .updateAxes();
    });

    ps.charts.forEach((pc, i) => {
      // only color charts in chartIDs
      if (chartIDs.includes(i)) {
        pc.color(palette);
      }
      pc.hideAxis(config.partition[i])
        .render()
        .updateAxes(0);
    });

    // if (flags.grid) {
    //   // rebuild the grid
    //   ps.attachGrid();
    //   ps.gridUpdate();
    // }

    return this;
  };

export default cluster;
