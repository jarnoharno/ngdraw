/*
  An Algorithm for Automatically Fitting Digitized Curves
  by Philip J. Schneider
  from "Graphics Gems", Academic Press, 1990

  Javascript port by Jarno Leppänen, 2014
*/

function Vector(x, y) {
  if (x instanceof Object) {
    this.x = x.x;
    this.y = x.y
  } else {
    this.x = x;
    this.y = y;
  }
}

function CreateVectorList(n) {
  var ret = new Array(n);
  for (var i = 0; i < n; ++i) {
    ret[i] = new Vector(0, 0);
  }
  return ret;
}

function CreateBezierCurve() {
  return CreateVectorList(4);
}

function V2Negate(v) {
	v.x = -v.x;
  v.y = -v.y;
	return v;
}

function V2SquaredLength(a) {
  return a.x * a.x + a.y * a.y;
}

function V2Length(a) {
	return Math.sqrt(V2SquaredLength(a));
}

/* normalizes the input vector and returns it */
function V2Normalize(v)  {
  var len = V2Length(v);
	if (len != 0.0) {
    v.x /= len;
    v.y /= len;
  }
	return v;
}

function V2Scale(v, newlen) {
  var len = V2Length(v);
	if (len != 0.0) {
    v.x *= newlen / len;
    v.y *= newlen / len;
  }
	return v;
}

/* return vector sum c = a+b */
function V2Add(a, b, c)
{
	c.x = a.x + b.x;
  c.y = a.y + b.y;
	return c;
}

/* return the distance between two points */
function V2DistanceBetween2Points(a, b)
{
  var dx = a.x - b.x;
  var dy = a.y - b.y;
	return Math.sqrt(dx * dx + dy * dy);
}

function V2Dot(a, b) {
	return a.x * b.x + a.y * b.y;
}

function V2SubII(a, b) {
  return new Vector(a.x - b.x, a.y - b.y);
}

function V2AddII(a, b) {
  return new Vector(a.x + b.x, a.y + b.y);
}

function V2ScaleIII(v, s) {
  return new Vector(v.x * s, v.y * s);
}

// test function
function main() {
  var d = [  /*  Digitized points */
    new Vector(0.0, 0.0),
    new Vector(0.0, 0.5),
    new Vector(1.1, 1.4),
    new Vector(2.1, 1.6),
    new Vector(3.2, 1.1),
    new Vector(4.0, 0.2),
    new Vector(4.0, 0.0),
    new Vector(2.0, -2.0),
    new Vector(2.0, -3.0),
    new Vector(4.0, -4.0)
  ];
  var error = 4.0;        /*  Squared error */
  FitCurve(d, error);     /*  Fit the Bezier curves */
}

function FitCurveArray(d, error) {
  var ret = [];
  FitCurve(d, error, function(curve) {
    ret.push(curve);
  });
  return ret;
}

function FitCurve(d, error, DrawBezierCurve)
//    Vector2  *d;         /*  Array of digitized points  */
//    double  error;      /*  User-defined error squared  */
{
  var tHat1, tHat2;       /*  Unit tangent vectors at endpoints */
  var nPts = d.length;

  tHat1 = ComputeLeftTangent(d, 0);
  tHat2 = ComputeRightTangent(d, nPts - 1);
  FitCubic(d, 0, nPts - 1, tHat1, tHat2, error, DrawBezierCurve);
}

/*
 *  FitCubic :
 *    Fit a Bezier curve to a (sub)set of digitized points
 */
function FitCubic(d, first, last, tHat1, tHat2, error, DrawBezierCurve)
//    Vector2  *d;      /*  Array of digitized points */
//    int    first, last;  /* Indices of first and last pts in region */
//    Vector2  tHat1, tHat2;  /* Unit tangent vectors at endpoints */
//    double  error;    /*  User-defined error squared     */
{
  var bezCurve; /*Control points of fitted Bezier curve*/
  var u;    ///*  Parameter values for point  */
  var uPrime;  /*  Improved parameter values */
  var maxError;  /*  Maximum fitting error   */
  var splitVector = {};  /*  Vector to split point set at   */
  var nPts;    ///*  Number of points in subset  */
  var iterationError; /*Error below which you try iterating  */
  var maxIterations = 4; /*  Max times to try iterating  */
  var tHatCenter;    // /* Unit tangent vector at splitVector */

  var iterationError = error * error;
  var nPts = last - first + 1;

  /*  Use heuristic if region only has two points in it */
  if (nPts == 2) {
    var dist = V2DistanceBetween2Points(d[last], d[first]) / 3.0;

    bezCurve = CreateBezierCurve();
    bezCurve[0] = d[first];
    bezCurve[3] = d[last];
    V2Add(bezCurve[0], V2Scale(tHat1, dist), bezCurve[1]);
    V2Add(bezCurve[3], V2Scale(tHat2, dist), bezCurve[2]);
    DrawBezierCurve(bezCurve);
    return;
  }

  /*  Parameterize points, and attempt to fit curve */
  u = ChordLengthParameterize(d, first, last);
  bezCurve = GenerateBezier(d, first, last, u, tHat1, tHat2);

  /*  Find max deviation of points to fitted curve */
  maxError = ComputeMaxError(d, first, last, bezCurve, u, splitVector);
  if (maxError < error) {
    DrawBezierCurve(bezCurve);
    return;
  }

  /*  If error not too large, try some reparameterization  */
  /*  and iteration */
  if (maxError < iterationError) {
    for (var i = 0; i < maxIterations; ++i) {
        uPrime = Reparameterize(d, first, last, u, bezCurve);
        bezCurve = GenerateBezier(d, first, last, uPrime, tHat1, tHat2);
        maxError = ComputeMaxError(d, first, last,
          bezCurve, uPrime, splitVector);
        if (maxError < error) {
          DrawBezierCurve(bezCurve);
          return;
        }
        u = uPrime;
    }
  }

  /* Fitting failed -- split at max error point and fit recursively */
  tHatCenter = ComputeCenterTangent(d, splitVector.ref);
  FitCubic(d, first, splitVector.ref, tHat1, tHatCenter, error, DrawBezierCurve);
  V2Negate(tHatCenter);
  FitCubic(d, splitVector.ref, last, tHatCenter, tHat2, error, DrawBezierCurve);
}

/*
 *  GenerateBezier :
 *  Use least-squares method to find Bezier control points for region.
 *
 */
function GenerateBezier(d, first, last, uPrime, tHat1, tHat2)
//    Vector2  *d;      /*  Array of digitized points  */
//    int    first, last;    /*  Indices defining region  */
//    double  *uPrime;    /*  Parameter values for region */
//    Vector2  tHat1, tHat2;  /*  Unit tangents at endpoints  */
{
    //ivar i;
    //var nPts;      /* Number of pts in sub-curve */
    //var C[2][2];      /* Matrix C    */
    //var X[2];      /* Matrix X      */
    var det_C0_C1,    /* Determinants of matrices  */
        det_C0_X,
        det_X_C1;
    var alpha_l,    /* Alpha values, left and right  */
        alpha_r;
    var tmp;      /* Utility variable    */
    //var bezCurve;  /* RETURN bezier curve ctl pts  */

    var bezCurve = CreateBezierCurve();
    var nPts = last - first + 1;

    var A = new Array(nPts);  /* Precomputed rhs for eqn  */
 
    /* Compute the A's  */
    for (var i = 0; i < nPts; ++i) {
      var v1, v2;
      v1 = new Vector(tHat1);
      v2 = new Vector(tHat2);
      V2Scale(v1, B1(uPrime[i]));
      V2Scale(v2, B2(uPrime[i]));
      A[i] = [ v1, v2 ];
    }

    /* Create the C and X matrices  */
    var C = [ [ 0.0, 0.0 ], [ 0.0, 0.0 ] ];
    var X = [ 0.0, 0.0 ];

    for (var i = 0; i < nPts; ++i) {
      C[0][0] += V2Dot(A[i][0], A[i][0]);
      C[0][1] += V2Dot(A[i][0], A[i][1]);
      /* C[1][0] += V2Dot(A[i][0], A[i][1]);*/  
      C[1][0] = C[0][1];
      C[1][1] += V2Dot(A[i][1], A[i][1]);

      tmp = V2SubII(d[first + i],
              V2AddII(
                V2ScaleIII(d[first], B0(uPrime[i])),
                V2AddII(
                  V2ScaleIII(d[first], B1(uPrime[i])),
                  V2AddII(
                    V2ScaleIII(d[last], B2(uPrime[i])),
                    V2ScaleIII(d[last], B3(uPrime[i]))))));
    

      X[0] += V2Dot(A[i][0], tmp);
      X[1] += V2Dot(A[i][1], tmp);
    }

    /* Compute the determinants of C and X  */
    det_C0_C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
    det_C0_X  = C[0][0] * X[1]    - C[0][1] * X[0];
    det_X_C1  = X[0]    * C[1][1] - X[1]    * C[0][1];

    /* Finally, derive alpha values  */
    if (det_C0_C1 == 0.0) {
      det_C0_C1 = (C[0][0] * C[1][1]) * 10e-12;
    }
    alpha_l = det_X_C1 / det_C0_C1;
    alpha_r = det_C0_X / det_C0_C1;


    /*  If alpha negative, use the Wu/Barsky heuristic (see text) */
    /* (if alpha is 0, you get coincident control points that lead to
     * divide by zero in any subsequent NewtonRaphsonRootFind() call. */
    if (alpha_l < 1.0e-6 || alpha_r < 1.0e-6) {
      var dist = V2DistanceBetween2Points(d[last], d[first]) / 3.0;

      bezCurve[0] = d[first];
      bezCurve[3] = d[last];
      V2Add(bezCurve[0], V2ScaleIII(tHat1, dist), bezCurve[1]);
      V2Add(bezCurve[3], V2ScaleIII(tHat2, dist), bezCurve[2]);
      return bezCurve;
    }

    /*  First and last control points of the Bezier curve are */
    /*  positioned exactly at the first and last data points */
    /*  Control points 1 and 2 are positioned an alpha distance out */
    /*  on the tangent vectors, left and right, respectively */
    bezCurve[0] = d[first];
    bezCurve[3] = d[last];
    V2Add(bezCurve[0], V2ScaleIII(tHat1, alpha_l), bezCurve[1]);
    V2Add(bezCurve[3], V2ScaleIII(tHat2, alpha_r), bezCurve[2]);
    return bezCurve;
}

/*
 *  Reparameterize:
 *  Given set of points and their parameterization, try to find
 *   a better parameterization.
 *
 */
function Reparameterize(d, first, last, u, bezCurve)
//    Vector2  *d;      /*  Array of digitized points  */
//    int    first, last;    /*  Indices defining region  */
//    double  *u;      /*  Current parameter values  */
//    BezierCurve  bezCurve;  /*  Current fitted curve  */
{
  var nPts = last-first+1;  
  var uPrime;    /*  New parameter values  */

  uPrime = new Array(nPts);
  for (var i = first; i <= last; ++i) {
    uPrime[i-first] = NewtonRaphsonRootFind(bezCurve, d[i], u[i-first]);
  }
  return uPrime;
}

/*
 *  NewtonRaphsonRootFind :
 *  Use Newton-Raphson iteration to find better root.
 */
function NewtonRaphsonRootFind(Q, P, u)
//    BezierCurve  Q;      /*  Current fitted curve  */
//    Vector2     P;    /*  Digitized point    */
//    double     u;    /*  Parameter value for "P"  */
{
  var numerator, denominator;
  var Q1 = CreateVectorList(3); /*  Q' and Q''      */
  var Q2 = CreateVectorList(2);
  var Q_u, Q1_u, Q2_u; /*u evaluated at Q, Q', & Q''  */
  var uPrime;    /*  Improved u      */
  
  /* Compute Q(u)  */
  Q_u = BezierII(Q, u);
  
  /* Generate control vertices for Q'  */
  for (var i = 0; i <= 2; ++i) {
    Q1[i].x = (Q[i+1].x - Q[i].x) * 3.0;
    Q1[i].y = (Q[i+1].y - Q[i].y) * 3.0;
  }
  
  /* Generate control vertices for Q'' */
  for (var i = 0; i <= 1; i++) {
    Q2[i].x = (Q1[i+1].x - Q1[i].x) * 2.0;
    Q2[i].y = (Q1[i+1].y - Q1[i].y) * 2.0;
  }
  
  /* Compute Q'(u) and Q''(u)  */
  Q1_u = BezierII(Q1, u);
  Q2_u = BezierII(Q2, u);
  
  /* Compute f(u)/f'(u) */
  numerator = (Q_u.x - P.x) * (Q1_u.x) + (Q_u.y - P.y) * (Q1_u.y);
  denominator = (Q1_u.x) * (Q1_u.x) + (Q1_u.y) * (Q1_u.y) +
    (Q_u.x - P.x) * (Q2_u.x) + (Q_u.y - P.y) * (Q2_u.y);
  
  /* u = u - f(u)/f'(u) */
  uPrime = u - (numerator/denominator);
  return uPrime;
}

/*
 *  Bezier :
 *    Evaluate a Bezier curve at a particular parameter value
 * 
 */
function BezierII(V, t)
//    Vector2   *V;    /* Array of control points    */
//    double   t;    /* Parametric value to find point for  */
{
  var degree = V.length - 1;
  var i, j;    
  var Q;          /* Vector on curve at parameter t  */
  var Vtemp = new Array(degree + 1); /* Local copy of control points */

  /* Copy array  */
  for (i = 0; i <= degree; i++) {
    Vtemp[i] = new Vector(V[i]);
  }

  /* Triangle computation  */
  for (i = 1; i <= degree; i++) {  
    for (j = 0; j <= degree-i; j++) {
      Vtemp[j].x = (1.0 - t) * Vtemp[j].x + t * Vtemp[j+1].x;
      Vtemp[j].y = (1.0 - t) * Vtemp[j].y + t * Vtemp[j+1].y;
    }
  }

  Q = Vtemp[0];
  return Q;
}

/*
 *  B0, B1, B2, B3 :
 *  Bezier multipliers
 */
function B0(u) {
  var tmp = 1.0 - u;
  return tmp * tmp * tmp;
}


function B1(u) {
  var tmp = 1.0 - u;
  return 3 * u * (tmp * tmp);
}

function B2(u) {
  var tmp = 1.0 - u;
  return 3 * u * u * tmp;
}

function B3(u) {
  return u * u * u;
}

/*
 * ComputeLeftTangent, ComputeRightTangent, ComputeCenterTangent :
 * Approximate unit tangents at endpoints and "center" of digitized curve
 */
function ComputeLeftTangent(d, end)
//    Vector2  *d;      /*  Digitized points*/
//    int    end;    /*  Index to "left" end of region */
{
  var tHat1 = V2SubII(d[end+1], d[end]);
  return V2Normalize(tHat1);
}

function ComputeRightTangent(d, end)
//    Vector2  *d;      /*  Digitized points    */
//    int    end;    /*  Index to "right" end of region */
{
  var tHat2 = V2SubII(d[end-1], d[end]);
  return V2Normalize(tHat2);
}

function ComputeCenterTangent(d, center)
//    Vector2  *d;      /*  Digitized points      */
//    int    center;    /*  Index to point inside region  */
{
  var V1 = V2SubII(d[center-1], d[center]);
  var V2 = V2SubII(d[center], d[center+1]);
  var tHatCenter = new Vector(
    (V1.x + V2.x) / 2.0,
    (V1.y + V2.y) / 2.0);
  return V2Normalize(tHatCenter);
}

/*
 *  ChordLengthParameterize :
 *	Assign parameter values to digitized points 
 *	using relative distances between points.
 */
function ChordLengthParameterize(d, first, last)
//    Vector2	*d;			/* Array of digitized points */
//    int		first, last;		/*  Indices defining region	*/
{
  //var u;			/*  Parameterization		*/

  var u = new Array(last - first + 1);

  u[0] = 0.0;
  for (var i = first+1; i <= last; ++i) {
    u[i-first] = u[i-first-1] + V2DistanceBetween2Points(d[i], d[i-1]);
  }

  for (var i = first + 1; i <= last; ++i) {
    u[i-first] = u[i-first] / u[last-first];
  }

  return u;
}

/*
 *  ComputeMaxError :
 *	Find the maximum squared distance of digitized points
 *	to fitted curve.
*/
function ComputeMaxError(d, first, last, bezCurve, u, splitVector)
//    Vector2	*d;			/*  Array of digitized points	*/
//    int		first, last;		/*  Indices defining region	*/
//    BezierCurve	bezCurve;		/*  Fitted Bezier curve		*/
//    double	*u;			/*  Parameterization of points	*/
//    int		*splitVector;		/*  Vector of maximum error	*/
{
    //int		i;
    var	maxDist;		/*  Maximum error		*/
    var dist;		/*  Current error		*/
    var P;			/*  Vector on curve		*/
    var v;			/*  Vector from point to curve	*/

    splitVector.ref = (last - first + 1)/2;
    maxDist = 0.0;
    for (var i = first + 1; i < last; ++i) {
      P = BezierII(bezCurve, u[i-first]);
      v = V2SubII(P, d[i]);
      dist = V2SquaredLength(v);
      if (dist >= maxDist) {
          maxDist = dist;
          splitVector.ref = i;
      }
    }
    return maxDist;
}
